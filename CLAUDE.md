# CLAUDE.md

Deponun kökünde durur, her oturumda okunur.

> **Sürüm notu:** Son güncelleme 20 Ekim 2026, uygulama sürümü 2.12.0
> (versionCode 38). Faz 0–6 bitti; kelime turu düelloda ve arenada;
> "oyun hissi" çalışmasının yedi maddesi tamam.
>
> **19–20 Ekim 2026: altyapı tamamen kendi sunucumuza taşındı.** Site
> Cloudflare Pages'ten Coolify'a, veritabanı/kimlik/Realtime/Edge
> Functions bulut Supabase'den kendi sunucumuza geçti. Bulut Supabase
> hesabıyla iş kalmadı. 2.12.0, yeni adrese bağlanan ilk pakettir;
> 2.11.0 ve öncesi hâlâ buluta yazar.
>
> **Veritabanı 20 Ekim 2026'da bilerek sıfırlandı.** Bütün oyun verisi
> ve gerçek hesaplar silindi (hepsi denemeydi). Yalnızca iki düello test
> hesabı, `ayar` tablosu ve göç kayıtları bırakıldı. Lig tablolarının
> boş olması hata değil.
>
> Ağustos 2026'da "reklam yok" kuralı değişti; projede artık AdMob var
> (kural 5). Bu dosya ile projenin gerçek durumu arasında çelişki
> görürsen **çalışmayı durdur ve sor.**

---

## Proje

Türkçe zihin oyunu platformu. İki oyun, tek altyapı:

- **Sayı Turu** — 6 rakam verilir, dört işlemle hedef sayıya ulaşılır
- **Kelime Turu** — 8 harf verilir, en uzun kelime türetilir

Platform oyunu bilmez. Oyunlar `TurSaglayici` arayüzüyle takılır.

**Marka:** Tam İsabet · **Paket:** `com.tamisabet.app` ·
**Web:** tamisabet.tr · **Depo:** `izzet-lab/zihin-turu`

> Marka 8 Ekim 2026'da **Zihin Turu**'ndan **Tam İsabet**'e değişti;
> alan adı zihin.artei.net yerine tamisabet.tr oldu. Depo adı eski
> kaldı (GitHub adresini değiştirmek açık PR'ları ve yerel kopyaları
> kırar). İki şey bilerek eski adıyla duruyor: imza anahtarının takma
> adı (anahtarın içinde yazılı, değiştirilemez) ve Instagram hesabı.
> Üçüncüsü olan bulut Supabase proje referansı artık geçersiz — o proje
> kapandı.

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

11. **Arayüzde sabit renk değeri kullanılmaz.** Her renk tema
    jetonundan gelir (`--kagit`, `--yuzey`, `--murekkep`, `--soluk`,
    `--hat`, `--vurgu`, `--odul`, `--sure`) ya da onlara bağlı
    `zt-*` sınıflarından. `bg-slate-900`, `text-cyan-300`, `#0A0E1A`
    gibi yazımlar tema değişince DEĞİŞMEZ ve ekranın yarısı bir
    temada, yarısı diğerinde kalır — 14 Ekim 2026'da tam bu oldu.
    **Tek istisna taş yüzeyi:** fildişi zemin ve `#1F2A37` rakam
    bilerek sabittir, çünkü taş bir arayüz öğesi değil fiziksel bir
    nesnedir (bkz. `[data-tas]`). Marka logoları da (Google gibi)
    kendi renklerinde kalır.

12. **Türkçe.** Kod içindeki isimler, yorumlar ve arayüz metinleri
    Türkçe. Değişken adlarında Türkçe karakter yok (`buyukSayi`,
    `büyükSayı` değil).

13. **Capacitor'da SPA yedeği yok.** `<a href>` ile tam sayfa geçişi
    Android'de 404 verir. Tüm gezinme router üzerinden.

14. **Yeşil takımdan başla.** Her işe başlamadan **önce** `npm test`,
    `npm run tip` ve `npm run e2e` çalıştır. Sunucu kodu değiştiyse
    `npm run sunucu-denetle` de — `sunucu/` klasörü tsconfig'in dışında,
    eksik bir import satırı `npm run tip`'ten geçip canlıda 500 verir.
    Fonksiyonlar arasında gezen Supabase istemcisi `istemci.ts`'teki
    `Istemci` tipiyle yazılır; `ReturnType<typeof createClient>`
    yazılırsa veritabanı tipi `unknown`a düşer ve denetim çöker. Kırmızı varsa önce onu
    düzelt, sonra yeni işe başla. *(24 Ağustos 2026'da üç ayrı yerde
    eski kırmızı bulundu — bu kural o yüzden var. Kırmızı bir takımın
    üstüne çalışmak, yeni hatayı eskilerin arasında kaybetmek demek.)*

---

## Üç dağıtım katmanı — sıra önemli

Proje üç ayrı yerde yaşıyor ve bunlar bağımsız güncelleniyor.
**Sıra bozulursa canlı site hata verir.**

| # | Katman | Nasıl güncellenir |
|---|---|---|
| 1 | **Veritabanı** (tablolar, tetikleyiciler) | kendi sunucumuzdaki Postgres — Studio ya da göç dosyası |
| 2 | **Edge Functions** (puan doğrulama) | sunucuda `araclar/edge-dagit.sh` |
| 3 | **Web** (site) | `git push` → Coolify webhook ile otomatik |

> **Üç katman da 19–20 Ekim 2026'da kendi sunucumuza taşındı.** Site
> Cloudflare Pages'ten Coolify'a, Supabase yığını buluttan aynı
> sunucuya. Alan adları: site `tamisabet.tr`, arka uç
> `api.tamisabet.tr`. Sunucu, Coolify kaynağı, SPA yönlendirmesi ve
> App Links dosyaları `sunucu/DAGITIM.md`'de; taşımanın kaydı
> `sunucu/SUPABASE-TASIMA.md`'de.
>
> **Yedek artık bizim işimiz.** Bulut Supabase kendisi yedekliyordu;
> artık sunucuda her gece 03:30'da `araclar/veritabani-yedek.sh`
> çalışıyor (14 gün saklama, `public` + `auth`). Sunucu tamamen
> giderse o yedekler de gider — dışarıya kopyalamak elle yapılıyor.
>
> `uygulama/public/_redirects` ve `_headers` Cloudflare Pages'e
> özgüdür; Coolify'da hükümleri yoktur. Karşılıkları
> `uygulama/nginx.conf` içinde — SPA yedeği ve önbellek kuralları
> oradan geliyor.

**Siteyi yayına alma.** `git push origin main` yeterli: GitHub deposunda
bir webhook var, Coolify'daki **tamisabet-web** uygulamasını kendisi
dağıtıyor (20 Ekim 2026'da kuruldu).

Webhook `https://coolify.guessclash.com/webhooks/source/github/events/manual`
adresine push olayı gönderiyor; parolası Coolify'ın uygulama için
ürettiği değer. Teslimat geçmişi GitHub'da depo ayarlarından görülür.

**Dağıtımın bittiğini "başarılı" yazısından değil, sitenin servis ettiği
paket dosyasının adı değişti mi diye bakarak anla.** Ad aynıysa eski kod
duruyordur. Webhook çalışmazsa Coolify'dan elle **Deploy** her zaman
yedek yol. *(Webhook kurulmadan önce push tek başına hiçbir şey yapmıyordu;
20 Ekim 2026'da sekiz commit depoda beklerken site eski kodu çalıştırdı ve
telefon uygulaması siteden ileride kaldı.)*

Site derlenirken `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` paketin
içine gömülüyor; ikisi de Coolify'da **tamisabet-web** uygulamasının ortam
değişkenlerinde. Boş olurlarsa site beyaz ekran verir (19 Ekim 2026'da
yaşandı).

**Android ayrı bir iş.** Site dağıtımı telefonu güncellemez; APK
`uygulama/android/paket-uret.sh --apk` ile ayrıca derlenip kurulur.
Adres ve anahtar APK'nın da içine gömülür.

**Edge Function dağıtım komutu** (sunucuda çalışır):

```bash
bash /root/projeler/tamisabet/araclar/edge-dagit.sh
```

Betik önce depoyu çeker, sonra her fonksiyonu kendi dizininde eksiksiz
hale getirip edge çalışma zamanını yeniden başlatır. **Sunucuda elle
dosya düzenlenmez** — depo tek doğru kaynak, betik yalnızca depodan
türetir.

Kendi sunucumuzdaki edge çalışma zamanında iki fark var, betik ikisini de
çözüyor: import haritası uygulanmıyor, ve her fonksiyon kendi dizinine
hapsediliyor (dizin dışındaki dosyayı okuyamıyor). Bu yüzden paylaşılan
oyun paketleri her fonksiyonun içine kopyalanıyor ve `@tamisabet/*`
adları göreceli yollara çevriliyor. Ayrıntı betiğin başındaki notta.

Bulut CLI'si için var olan `supabase/functions/` köprü klasörü ve
`supabase` komut satırı aracı **depodan kaldırıldı** (20 Ekim 2026).
Eski bir belgede `npx supabase functions deploy` görürsen o yol artık
yok.

Yeni arayüz kodu olmayan sütunları arayacağı için **önce veritabanı,
sonra fonksiyon, en son push.**

**Oyun mantığı değiştiyse Edge Function'ı yeniden dağıtmak zorunludur.**
İstemci ve sunucu farklı tur üretirse her tur reddedilir.

---

## Düello test hesapları

Gerçek maç e2e testi iki kimlikli oyuncu ister. İki test hesabı canlı
projede tanımlı (`test_duello_1`, `test_duello_2`) ve yalnızca test için
parolaları var — uygulamanın giriş akışına test kapısı açılmadı.

Kimlik bilgileri `.env.test` dosyasında ve o dosya `.gitignore`'da.
**Dosya yoksa düello maç testleri sessizce atlanır**, kalan testler
çalışır. Yeni bir makinede kurmak için Supabase yönetim API'siyle iki
kullanıcı açıp `.env.test` dosyasına şu üç satırı yazmak yeterli:
`DUELLO_TEST_EPOSTA_1`, `DUELLO_TEST_EPOSTA_2`, `DUELLO_TEST_PAROLA`.

---

## Mimari

```
paketler/cekirdek       TurSaglayici arayüzü, tohumlu rastgelelik
paketler/oyun-sayi      sayı turu: üretici, çözücü, doğrulayıcı, puanlayıcı, bot
paketler/oyun-kelime    kelime turu: sözlük, üretici, doğrulayıcı, puanlayıcı, bot
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
  /** Maç sonu özetinde turun tek satırlık tanımı. */
  turTanimi?(tur: Tur): string;
  /** Düello ve arenaya girecek oyunlar bunu uygular. */
  bot?: BotYetenegi;
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

**Lig:** Oyun ve seviye başına ayrı tablo — lig tabloları `oyun`
sütunuyla yazıldığı için ikinci oyun göç gerektirmedi. Günlük tabloya o
günün **en iyi** maçı yazılır, toplamı değil. Haftalık ve aylık, günlük
en iyilerin toplamı. Antrenman ayrı "çalışkanlık" tablosunda, haftalık
sıfırlanır. Düello derecesi ve arena madalyası seviyeden bağımsız.

Günlük seri oyuna göre ayrılmaz: hangi oyun oynanırsa oynansın "bugün
oynadı" sayılır. Seri alışkanlığı ölçüyor, beceriyi değil.

**XP:** Lv.1 Çaylak (0), Lv.2 Hesapçı (500), Lv.3 Zihin İşçisi (2.000),
Lv.4 Rakam Ustası (5.000), Lv.5 Tam İsabet Ustası (12.000).
Seri ödülleri: her gün +10, 3 gün +25, 7 gün +75, 30 gün +300,
100 gün +1.000. **Puan oynamadan verilmez.** Ayda bir seri koruma hakkı.

**Giriş sistemi ve yönetim paneli** (göç 019, 20 Ekim 2026). Giriş
ekranının kipi `ayar.giris_sistemi`nden okunuyor ve `/yonetim`
panelinden değiştiriliyor. *Sistem 1* e-posta + parola + Google;
*sistem 2* (varsayılan) yalnızca isim: hesap anonim oturumla açılıyor,
kullanıcı adı isimden üretiliyor (`isim-karar.ts`: "Nazım" → "nazim",
alınmışsa "nazim2"). Sistem 2 giriş servisinde **anonim hesapların
açık olmasını** ister (`ENABLE_ANONYMOUS_USERS=true`); kapalıysa ekran
"isimle giriş şu an kapalı" der. İsimle açılmış hesap cihaza bağlı;
oyuncu profilindeki "Profilini doğrula"dan e-posta + parola ekleyince
kalıcı oluyor. **Yaş kapısı sistem 2'de de var** (kural 6) — kural
`yas-karar.ts`'te, iki ekran onu kullanıyor. Panel yetkisi sunucuda:
`yonetici` tablosu, yönetici eklemek yalnızca veritabanından.

**Kelime turu:** Dört seviye (Isınma 7 harf, Normal 8, Zor 9, Usta 10).
Sözlük Zemberek kök listesinden üretiliyor (Apache 2.0, ~50 bin kelime:
kökler + düzenli çoğullar). Liste `araclar/kelime-listesi-uret.mjs` ile
üretilir, elle düzenlenmez. Günün Kelime Turu lige işler, Antrenman
işlemez. Doğrulama `kelime-gonder` Edge Function'ında.

**Çekimli biçimler listede değil, kuralla tanınıyor** (`cekim.ts`):
"kitabı", "evlerimizde", "burnu", "hakkı", "kalemle" kabul ediliyor.
Yirmi beş bin kökün bütün çekimlerini üretmek listeyi üç yüz binin
üzerine çıkarırdı. Son ünlüsü düşen ("burun"→"burn") ve son ünsüzü
ikilenen ("hak"→"hakk") kökler kurala bağlanamadığı için üretimde
ayrı bir **bağlı gövde** listesine yazılıyor (270 madde). Tanıma
bilerek cömert: olmayan bir çekimi de kabul edebiliyor ("kitapu"),
çünkü haklı bir cevabı reddetmenin bedeli daha büyük.

Kelime turu düelloya ve arenaya da giriyor. Eşleştirme kuyruğu oyuna
göre ayrı (göç 014); maç ve durum yanıtları `oyun` alanını taşıyor,
tahtayı o belirliyor. Alkollü içecek adları listede yok — süzgeç
üretim betiğinde.

**Düello:** 1v1, 5 tur, ELO derecesi, rakip yoksa 8 saniyede bot.
Rakibin yalnızca hedefe uzaklığı yayınlanır. Rövanş ve özel oda var.

**Arena:** 5 kişilik eşzamanlı yarış, 5 tur, ilk tam isabet turu
kapatır. Boş koltuklar botla dolar; en fazla biri güçlü ve bir bot
turu, tur süresinin yarısı geçmeden kapatamaz. Madalya tablosu
(altın > gümüş > bronz > toplam puan); **yalnızca en az iki gerçek
yarışçının olduğu arenalar sayılır.**

**Oyun hissi** (Ekim 2026 tasarım çalışması, yedi maddenin hepsi
bitti): taşlar yaylı basılıyor ve nesne gibi duruyor, yeni turda
sırayla düşüyor; ekran geçişleri kayarak; tam isabette sarsıntı;
puanlar sayarak çıkıyor; süre çubuğu son on saniyede nabız atıyor.
Dokunsal geri bildirim var (Capacitor Haptics). Renk anlam taşıyor:
marka cyan, ödül altın, uyarı amber, kayıp soğuk kırmızı, nadir mor —
**ödül altını uyarı sarısından ayrı bir ton.** Emoji kullanılmıyor,
tek bir SVG ikon takımı var (`bilesenler/Ikon.tsx`). Seviye atlama,
rozet ve seri eşikleri tam ekran kutlanıyor (`kutlama-karar.ts` kararı
verir, `Kutlama.tsx` gösterir). Bütün animasyonlar yalnızca
`transform`/`opacity` ve `prefers-reduced-motion` ile tek yerden
kapanıyor.

**Tam isabet kutlaması iki katmanlı** (14 Ekim 2026). Her isabette
kısa vuruş; Günün Turu, düello galibiyeti, arena birinciliği, Zor/Usta
isabeti ve seri kilometre taşında uzun jingle + "Tam isabet!"
seslendirmesi + hedef halkaları. **Rutin antrenman isabetinde tören
çalmaz** ve iki tören arasında en az bir dakika vardır — yoksa ses
yıpranır, oyuncu da sesi tamamen kapatır. Karar
`kutlama-sesi-karar.ts` içinde saf. Ses dosyaları
`varliklar/ses-kaynak/` altında durur ve `araclar/ses-uret.sh` ile
yayına üretilir (60 KB bütçesi betikte denetleniyor); elle
dönüştürülmez.

**Ses ve titreşim** oyuncunun kendi profilinde, ortak bir "Oyun
ayarları" bloğunda. Aynı blok gizlilik ayarlarında da duruyor —
misafirin profil sayfası yok, yoksa sesi kapatamazdı.

**Tamamlanan:** Faz 0–3C (çekirdek, tek kişilik oyun, PWA, üyelik,
misafir geçişi, sunucu doğrulama, lig, XP, seri, gerçek oyuncu
sayaçları, yasal metinler, hesap silme), Faz 4 (düello), Faz 5 (arena),
Faz 6 (kelime turu — düello ve arena dahil), Capacitor Android paketi,
Firebase (Analytics/Crashlytics/Remote Config), AdMob banner, yaş 13 +
UMP onay akışı, rozetler ve ödül töreni.

**Yığın:** TypeScript · React + Vite · Tailwind · kendi sunucumuzda
Supabase yığını (Postgres, Auth, Realtime, Edge Functions) · Coolify ·
Capacitor · Vitest + Playwright

---

## Bekleyen işler

### ~~B komutu~~ — bitti (24 Ağustos 2026)
İlk oturum reklamsızlığı yapıldı, ödüllü videonun `npa` doğrulaması
tamam. Ayrıntı `CHANGELOG.md`'de.

### ~~C komutu~~ — bitti (24 Ağustos 2026)
Günlük hatırlatma tamam. Karar mantığı `bildirim-karar.ts` içinde saf ve
test edilebilir; native katman yalnızca uyguluyor. Ayrıntı `CHANGELOG.md`'de.

### ~~D komutu~~ — bitti (24 Ağustos 2026)
Zorluk sırası düzeldi. Yol boyunca kritik bir hata bulundu: üretim makine
hızına bağlıydı, aynı tohum farklı makinede farklı tur üretiyordu.
Ayrıntı `CHANGELOG.md`'de.

### ~~E komutu~~ — bitti (24 Ağustos 2026)
Alt banner gezinme çubuğunun üstüne alındı (AdMob geçersiz tıklama
riski), Yardım gerçek arayüzü anlatır hale getirildi, dokunma hedefleri
44px'e çıkarıldı. Ayrıntı `CHANGELOG.md`'de.

### F — Play Store paketi — büyük ölçüde bitti (5 Eylül 2026)
İmzalı AAB üretildi (1.4.0, versionCode 8), `paket-uret.sh` ile tek
komuta indirildi, R8 sonrası paket içeriği denetlendi, Data safety
notları gerçek duruma göre yazıldı.

Yol boyunca bir çelişki çıktı ve karara bağlandı: manifest reklam
kimliği iznini kaldırıyordu, bu yüzden kural 6'nın "18+ onay verirse
kişiselleştirilmiş reklam" vaadi çalışmıyordu. İzin geri kondu; 18 altı
yasağı `npa` bayrağıyla aynen sürüyor. Ayrıntı `CHANGELOG.md`'de.

**Kalan iş:** Yasal metinler avukat onayından geçmeli — reklam
kimliği ifadeleri değişti. (Paketin cihazda çalıştığı doğrulandı:
proje sahibi 9 Ekim 2026'da 2.x sürümlerini kurup oynadı.)

### ~~Faz 4 — Düello~~ — bitti (Eylül 2026)
### ~~Faz 5 — Arena~~ — bitti (7 Ekim 2026)
### ~~Faz 6 — Kelime turu~~ — bitti (8 Ekim 2026)
### ~~Kelime turu düelloda ve arenada~~ — bitti (9 Ekim 2026)
### ~~Oyun hissi (yedi madde)~~ — bitti (9 Ekim 2026)
### ~~Kupa ve rozetler, ödül töreni~~ — bitti (9 Ekim 2026)

Ayrıntılar `CHANGELOG.md`'de.

### Sıradakiler

0. ~~**E-posta ile kayıt kırıktı**~~ — çözüldü (20 Ekim 2026).
   E-posta onayı zorunluydu ama SMTP tanımlı olmadığı için onay postası
   hiç gitmiyordu: kayıt olan hesap onaysız kalıyor, giriş
   tamamlanamıyor, kullanıcı adı seçilemiyor ve oynanan tur **hiçbir
   yere yazılmıyordu.** Hata mesajı çıkmadığı için fark etmesi zordu.
   Çözüm: `ENABLE_EMAIL_AUTOCONFIRM=true`. **Bedeli bilinçli:** e-posta
   adresleri doğrulanmadan kabul ediliyor. Yayına çıkarken ya Google
   girişi açılacak ya posta servisi tanımlanacak (bkz. madde 1).

   **Buradan çıkan kalıcı ders:** Coolify'da ortam değişkenini
   değiştirmek yetmiyor. Yeniden dağıtım `.env` dosyasını güncelliyor
   ama kapsayıcıyı yeniden YARATMIYOR; eski kapsayıcı eski değeri
   taşımaya devam ediyor. Değişikliğin geçmesi için ilgili kapsayıcı
   `--force-recreate` ile yeniden yaratılmalı. Aynı tuzağa Realtime'da
   da düşüldü. Değişkeni değiştirdikten sonra **kapsayıcının içindeki
   değeri doğrula**, Coolify'ın "başarılı" demesine güvenme.
1. **Google girişi — sunucu tarafı hazır, kimlik bilgileri bekleniyor.**
   Coolify'daki Supabase tanımına `GOTRUE_EXTERNAL_GOOGLE_*` satırları
   eklendi (20 Ekim 2026). Yönlendirme adresi elle yazılmıyor,
   `API_EXTERNAL_URL`'den türüyor. Sağlayıcı **bilerek kapalı**
   (`ENABLE_GOOGLE_SIGNUP=false`): kimlik bilgileri boşken açık
   bırakmak kimlik servisini başlatmada düşürebilir, o da e-posta
   girişi dahil herkesin girişini keser.

   Kalan iş: Google Cloud Console'da **Web application** tipi OAuth
   istemcisi açmak, izinli yönlendirme adresine
   `https://api.tamisabet.tr/auth/v1/callback` yazmak, çıkan iki değeri
   Coolify'da `GOOGLE_CLIENT_ID` ve `GOOGLE_SECRET` değişkenlerine
   girmek, sonra `ENABLE_GOOGLE_SIGNUP=true` yapmak.

   **Dikkat:** onay ekranı "Testing" kipindeyse yalnızca test
   kullanıcısı listesindekiler giriş yapabilir; herkese açmak için
   yayımlanması gerekir. Ve değişiklikten sonra kapsayıcı yeniden
   yaratılmalı — Redeploy tek başına yetmiyor (bkz. madde 0).
2. **FCM bildirimleri.** Günlük hatırlatma şu an yalnızca cihazda
   kurulu (yerel bildirim); sunucudan gönderim yok.
3. **Play Store.** Hesap, mağaza listesi, Data safety formu, 12–15
   test kullanıcısı, 14 günlük kapalı test. Proje sahibinin işi.
4. **Yasal metinler avukat onayı** — reklam kimliği ifadeleri değişti.
5. ~~**Crashlytics eşleme dosyası** yüklenmiyor~~ — çözüldü
   (9 Ekim 2026). Sebebi Avast'ın TLS tarama kökünü yenilemesiydi;
   Java'nın güven deposu eski kökü tutuyordu. `bash
   araclar/java-guven-deposu.sh` depoyu Windows'taki güncel kökten
   yeniden kuruyor. Avast kökü yine değişirse aynı betik çalıştırılır.
6. ~~**Edge Function tip denetimi tam değil**~~ — çözüldü
   (9 Ekim 2026). `npm run sunucu-denetle` artık TAM denetim yapıyor;
   her hata kırmızı. Yalnızca veritabanı şeması denetim dışında
   (şemanın TypeScript karşılığı üretilmiyor, sütun adları
   doğrulanmıyor).

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
- Kelime listesini elle düzenlemek — betikle üretiliyor, elle değişiklik ilk üretimde kaybolur
- Ses dosyasını doğrudan `public/ses/` içine koymak — `araclar/ses-uret.sh` ile üretiliyor, bütçe orada denetleniyor
- Her tam isabette uzun jingle çalmak — ses yıpranır, oyuncu sesi tamamen kapatır
- Sözlüğü değiştirip Edge Function'ları dağıtmamak — aynı tohum iki tarafta farklı tur üretir
- Arayüze emoji koymak — her telefonda başka çiziliyor, `bilesenler/Ikon.tsx` var
- Sabit renk yazmak — tema değişince değişmiyor, ekranın yarısı öbür temada kalıyor
- Taşa tema rengi sınıfı vermek — gece temasında rakam fildişi taşın üstünde okunmuyor
- Güvenli alan boşluğunu gövdeye vermek — kaydırılabilir ekranda içerik durum çubuğunun altına giriyor
- Ödül altını yerine uyarı sarısı kullanmak — iki anlam karışır
- `transform`/`opacity` dışında bir şeyi canlandırmak — ucuz telefonda kare düşer
- Aynı kartı iki ekranda ayrı ayrı yazmak — seri/XP kartı tam bunu yaşadı
- `deno check`'i depo kökünde çalıştırmak — `node_modules/.deno` açıp npm ağacını bozuyor
- e2e koşarken başka bir önizleme sunucusu açık bırakmak — Playwright artık port doluysa hata veriyor, eskiden eski koda karşı sessizce yeşil veriyordu
- Doğum yılını giriş ekranına da koymak — hesap açılırken bir kez
  doğrulanıyor, her girişte sormak gereksiz sürtünme (20 Ekim 2026'da
  kaldırıldı, bilinçli)
- Doğum yılı alanını tamamen kaldırmak — kural 6 çöker: 13 yaş sınırı
  uygulanamaz, veli onayı sorulamaz, ve yaş bilinmeyince oyuncu
  yetişkin sayılıp 18 altına kişiselleştirilmiş reklam gider; bu Play
  Store Data safety beyanıyla çelişir. Kaldırmak istenirse önce
  `resinDegilMi()` varsayılanı "bilinmiyorsa 18 altı" yapılmalı
- Kod parçası göstererek açıklama yapmak — proje sahibi kod okumuyor
