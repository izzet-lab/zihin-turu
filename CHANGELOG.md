# Değişiklik günlüğü

Bu dosya, oyun dengesini veya veri yapısını etkileyen değişiklikleri kaydeder.
Küçük hata düzeltmeleri ve görsel rötuşlar buraya yazılmaz.

## 2026-10-09 - Önce oyun, sonra mod; kelime sözlüğü gündelikleşti

### "Ana sayfa" çalışmıyordu

Antrenman sonucundayken menüdeki "Ana sayfa" hiçbir şey yapmıyordu.
Sebebi: oyun ve sonuç ekranları ayrı bir ADRES değil, ana adresin
içindeki durumlar. Düğme yalnızca adresi değiştiriyordu, adres zaten
"/" olduğu için hiçbir şey olmuyordu. Artık ana adresteyken olay
gönderiliyor. Lig, kelime ve yasal sayfalardan da denendi.

### Ana ekran: önce oyun, sonra mod

İki oyun olunca "Antrenman" tek başına ne anlama geldiğini söylemiyordu
— sayı antrenmanı mı, kelime antrenmanı mı? Artık en üstte iki oyun
kartı var (Sayı Turu / Kelime Turu); seçilen oyuna göre altındaki mod
ızgarası değişiyor.

Proje sahibinin önerisinde iki boşluk vardı, ikisi de kapatıldı:

- **Günün Turu modlar arasında duruyor.** Öneride yoktu ama günlük
  ritüel oyunun en önemli alışkanlığı; seriyi, ligi ve geri dönüşü o
  taşıyor. İlk sırada ve tek vurgulu kart.
- **Kelime turunda Düello ve Arena "Yakında".** Kelime turu tek
  kişilik; aktif görünüp hiçbir yere gitmeyen düğme oyuncuyu çıkmaz
  sokağa sokardı.

### Ana ekranda ilk 10, Sıralamalar'da kendi sayıların

Ana ekranın altına **İlk 10** eklendi: Düello ve Arena sekmeleri,
"Tümü →" ile Sıralamalar'a bağlanıyor. "Kaçıncıyım" sorusu oyunu açan
herkesin ilk sorusu; o tablo ayrı bir sayfada durdukça kimse
görmüyordu.

Sıralamalar sayfasının başına **Senin istatistiklerin** kartı kondu:
toplam tur, tam isabet, isabet yüzdesi, sayı/kelime dağılımı, en iyi
puan; düello sırası ve galibiyet dökümü; arena sırası ve madalyalar.
Lig tabloları "kim önde" sorusunu cevaplıyordu, bu "ben ne yaptım"
sorusunu.

### Kelime turu artık bilinen kelimeleri soruyor

Proje sahibi 50 antrenman turunda 10'unu bile bilememiş; örnek verdiği
kelimeler "bikir", "aktöre", "cünun", "birsam". Hepsi listede
bulundu — kök sözlüğü TDK tabanlı ve artık kullanılmayan binlerce
kelime içeriyor.

**İki liste yapıldı:**

- **Tanınan liste (~50 bin):** oyuncunun cevabını kabul eder. Geniş
  kaldı; nadir bir kelime bilen ödüllendirilsin.
- **Yaygın liste (~5 bin):** havuzun çekirdek kelimesi ve "en uzun
  kelime" buradan seçiliyor. Kaynak, Zemberek'in kendi `first-10K`
  sıklık listesi — aynı depo, aynı Apache 2.0 lisansı.

Böylece hedef her zaman günlük hayatta var olan bir kelime. Hedef
listesinden kaba sözler ayrıca ayıklandı: oyun "bu havuzun en uzun
kelimesi BOKLAR" demez. (Kelimeler yine kabul ediliyor, sadece hedef
olarak seçilmiyorlar. Betiğin elle bakılan tek yeri burası.)

**Ölçüm, seviye başına 150 tur:**

| Seviye | Tek çözüm % (önce → sonra) | Puan getiren kelime % |
|---|---|---|
| Isınma | 34 → 13 | 96 |
| Normal | 37 → 14 | 95 |
| Zor | 44 → 17 | 93 |
| Usta | 49 → 21 | 74 |

"Tek çözüm", en uzun kelimenin tek olduğu turların oranı — yani
bulması ya hep ya hiç olan turlar. Yarıdan beşte bire indi.

## 2026-10-08 - Ana ekran yeniden kuruldu, kelime turu dengelendi

### Ana ekran bir menüye dönüşmüştü

Beş mod kartı, zorluk, süre, büyük sayı, seri ve XP aynı sayfada alt
alta duruyordu. En kötüsü şuydu: "Zorluk" yalnızca Günün Turu ile
Antrenman'ı ilgilendirdiği hâlde Düello ve Arena kartlarının ALTINDA
duruyordu. Oyuncu hangi ayarın neye ait olduğunu anlayamıyordu.

Yeni yapı:
- **Günün Turu** tek baskın kart — günlük ritüel, ana eylem.
- Altında **2×2 ızgara**: Antrenman, Düello, Arena, Kelime Turu. Hepsi
  aynı boyda, aynı görsel ağırlıkta ve **tek vurgu renginde**. Üç ayrı
  renk kullanılmıyor; sarı bu uygulamada uyarı ve reklam rengi, mod
  kartında kullanmak o anlamı bozuyor.
- **Zorluk ve süre ana ekrandan kalktı.** Her mod kendi seviyesini
  kendi ekranında seçiyor; Düello ve Arena zaten öyle yapıyordu, artık
  Günün Turu ve Antrenman da öyle yapıyor.
- En altta seri şeridi ve XP kartı.

Başlıktaki işaret yeni ikon oldu; eski "birleşen taşlar" görseli
(`logo.svg`) projeden tamamen kaldırıldı. Alt başlık platformu
anlatıyor: "Türkçe zihin oyunları — sayılar ve kelimeler." Önceki
satır yalnızca sayı turunu anlatıyordu, oysa artık kelime oyunu da var.

### Kelime Turu ekranı ana ekranla tutarlı

Sağ üstteki yuvarlak "✕" sabit hamburger menünün üstüne biniyordu;
çıkış artık uygulamanın her yerindeki gibi sol üstte "← Geri". Seviye
kartları ana ekranla **aynı bileşeni** kullanıyor. Mod kartlarının alt
yazıları ana ekrandaki dille aynı. Seri ve XP bu ekranda da görünüyor.

### Büyük rakamların solu kırpılıyordu

Sebep yazı tipiydi: Space Grotesk 300–700 arası geliyor, **900
ağırlığı yok**. Arayüzde `font-black` kullanılan her yerde tarayıcı
700'ü alıp kendisi şişiriyordu ("sahte kalın"). Sahte kalın, harfin
mürekkebini kutusunun dışına taşırıyor; punto büyüdükçe taşma da
büyüyor ve `overflow: hidden` olan yüzeylerde ilk rakamın solu
tıraşlanıyordu. Ölçüldü: taşta 1px sola taşma vardı. Sentez kapatıldı
(gerçek 700 yüzü kullanılıyor), taşların yan boşluğu 4px'ten 8px'e
çıktı.

### Marka değişikliğinde kaybolan ilerleme

Paket adı ve alan adı değişince tarayıcı deposu yeni bir kaynak
altında açılıyor ve eski ilerleme okunamıyor. Bu bir hata değil,
tarayıcının güvenlik kuralı — ama oyuncu serisinin neden sıfırlandığını
bilmiyor.

- **Üyede çözüldü:** giriş yapılmışsa ilerleme sunucudan geri
  yükleniyor — seri, açılmış seviyeler ve son günlerin Günün Turu
  geçmişi. Yalnızca EKLER, hiçbir şeyi silmez; yerelde daha ileri bir
  ilerleme varsa korunur.
- **Misafirde çözülemiyor.** Veri hiçbir yerde yok. Ana ekranda bunu
  açıkça söyleyen bir not var ve giriş yapmaya çağırıyor.

### Kelime turu zorluk ölçümü ve dengeleme

Sayı turundaki ölçümün karşılığı yazıldı
(`testler/kelime-zorluk-olcum.ts`). Seviye başına 200 tur:

| Seviye | Harf | En uzun (ort) | Havuzdaki kelime | Puan getiren |
|---|---|---|---|---|
| Isınma | 7 | 4,85 | 22 | %87 |
| Normal | 8 | 5,74 | 40 | %66 |
| Zor | 9 | 6,50 | 67 | %43 |
| Usta | 10 | 7,51 | 105 | **%24** |

Önce bir yanlış anlamayı giderdi: Usta'da 10 harften 10 harflik kelime
bulmak **gerekmiyor**; o havuzlardan çıkan en uzun kelime ortalama 7,5
harf.

Asıl sorun puanlamaydı. Puan "en uzundan kaç harf kısa" sorusuna
bakıyordu (0/1/2 harf → 10/7/5, gerisi 0). İki harf, en uzunun 5 olduğu
turda büyük bir hata; 10 olduğu turda küçük. Sabit eşik yüzünden
Usta'da havuzdaki kelimelerin dörtte üçü sıfır getiriyordu.

Puan artık **orana** bakıyor: yazdığın kelime, bulunabilecek en uzunun
yüzde kaçı. Eşik seviyeyle birlikte kendiliğinden genişliyor, seviye
başına tablo tutmak gerekmiyor. Ölçüm tekrarlandı — puan getiren
kelime oranı: Isınma %99, Normal %93, Zor %84, Usta %67. Gradyan
duruyor (üst seviyede puan almak hâlâ zor) ama "doğru kelimeyi buldum,
sıfır aldım" artık istisna.

## 2026-10-08 - Marka: Zihin Turu → Tam İsabet (sürüm 2.0.0)

Uygulama henüz mağazada olmadığı için paket adı da değişebildi; bu son
şanstı.

### Değişenler

- **Paket adı:** `com.zihinturu.app` → `com.tamisabet.app`. Gradle
  namespace ve applicationId, AndroidManifest, Java paket klasörü,
  Capacitor yapılandırması, derin bağlantı şeması
  (`com.tamisabet.app://giris`) ve `google-services.json`.
- **Görünen ad:** Android uygulama adı, PWA manifest (name /
  short_name), sayfa başlığı, apple-mobile-web-app-title, og ve
  twitter etiketleri, arayüz metinleri, XP unvanı ("Tam İsabet
  Ustası"), yasal metinler, README, CLAUDE.md, CHANGELOG, mağaza
  notları.
- **Alan adı:** zihin.artei.net → tamisabet.tr. Profil adresi örneği,
  og görseli adresi, yasal metinler.
- **İkonlar:** yeni set (192, 512, maskable 512, apple-touch, favicon,
  og görseli). Manifest'te maskable olanın `purpose` değeri
  `maskable`, diğerleri `any`.
- **Paket kapsamı:** `@zihinturu/*` → `@tamisabet/*`. On Edge
  Function'ın hepsi yeni kapsamla yeniden dağıtıldı ve canlıda
  denendi.

### Paylaşım kartı

"Tam isabet" zaten oyunun kazanma mesajı. Kartta marka ile sonuç aynı
sözü tekrarlamasın diye iki şey yapıldı: marka üstte küçük (38px) ve
sakin bir renkte, bir künye gibi; kazanma satırı ise büyük (72px) ve
artık **"HEDEFİ TUTTURDUN 🎯"** yazıyor. Aynı şeyi söylüyor, kartta
iki kez okunmuyor.

### Tarayıcı deposu taşındı

Oyuncunun serisi, günlük kilidi, ses tercihi, doğum yılı ve veli onayı
tarayıcı deposunda `zihinturu.*` anahtarlarıyla duruyordu. Anahtarlar
`tamisabet.*` oldu ve **tek seferlik bir kopyalama** eklendi: eski
anahtar varsa değeri yenisine taşınıyor. Olmasaydı mevcut oyuncular
serilerini ve yaş kaydını kaybeder, yaş sorusu yeniden sorulurdu.

### Bilerek eski adıyla kalanlar

- **İmza anahtarının takma adı** (`zihinturu`). Takma ad anahtarın
  içinde yazılı; değiştirmek yeni bir anahtar üretmek demek olurdu ve
  Play Store uygulamayı aynı uygulama saymazdı.
- **Supabase proje referansı**, tablo ve sütun adları, Edge Function
  adları — iç isimler, kullanıcı görmüyor.
- **Depo adı** `izzet-lab/zihin-turu` — değiştirmek açık PR'ları ve
  yerel kopyaları kırar.
- **Instagram hesabı** `@zihinturuapp` — proje sahibinin hesabı;
  koddan değiştirilemez.

### Proje sahibinin yapması gerekenler

1. **Firebase**: `com.tamisabet.app` için yeni bir Android uygulaması
   tanımlanmalı ve yeni `google-services.json` indirilmeli. Şu anki
   dosyada paket adı elle değiştirildi; Firebase konsolunda karşılığı
   yoksa Analytics ve Crashlytics çalışmaz.
2. **AdMob**: uygulama kimliği paket adına bağlı. Yeni paket için yeni
   bir AdMob uygulaması açılmalı ve manifest'teki kimlik
   güncellenmeli.
3. **Supabase Auth**: izin verilen dönüş adreslerine
   `com.tamisabet.app://giris` ve `https://tamisabet.tr` eklenmeli.
4. **Alan adı**: tamisabet.tr alınıp Cloudflare Pages'e bağlanmalı.
5. **Yasal metinler** avukata yeniden gösterilmeli. Metinlerin başına
   "bu sürümde yalnızca marka ve alan adı değişti" notu eklendi.

## 2026-10-08 - Sonuç ekranı turun işlenip işlenmediğini söylüyor

Antrenman hatasının yedi hafta yaşamasının sebebi hata değil,
**sessizlikti**: tur sunucuya "ateşle ve unut" biçiminde gönderiliyor,
sunucu hata verince oyuncuya hiçbir şey görünmüyordu.

Artık sayı turunun sonuç ekranında da küçük bir satır var:
"Lige işlendi" / "Çalışkanlık tablosuna işlendi", gönderim sürerken
"Sunucuya gönderiliyor…", hata olursa "Puanın kaydedilemedi —
bağlantını kontrol edip tekrar dene." Misafirde gösterilmiyor; orada
zaten üyelik daveti çıkıyor ve iki mesaj üst üste binerdi.

Ayrıca giriş yapmış bir test hesabıyla gerçek bir antrenman turu
oynayıp sonucun çalışkanlık tablosuna işlendiğini doğrulayan bir e2e
testi eklendi. Aynı hata tekrarlarsa bu test kırmızı olur — yedi hafta
beklemeye gerek kalmaz.

## 2026-10-08 - Antrenman turları yedi haftadır kaydedilmiyormuş

Kelime turunu lige bağlarken ortaya çıktı: **18 Ağustos 2026'dan beri
hiçbir antrenman turu veritabanına işlenmemiş.** Günün Turu çalışıyordu,
antrenman çalışmıyordu.

Sebebi, lig tetikleyicisinde bir değişken adının tablo sütun adıyla
aynı olması. Postgres hangisinin kastedildiğini bilemeyip hata
veriyor, satır geri alınıyordu. Günün Turu'nun etkilenmemesi, orada
aynı adda bir değişkenin bulunmamasındandı.

Oyuncuya hiçbir şey görünmüyordu: istemci sunucu hatasını sessizce
yutup oyuna devam ediyordu. Sonuç olarak yedi haftadır **çalışkanlık
tablosu ve antrenman XP'si hiç güncellenmemiş.** Kaybedilen kayıtlar
geri getirilemiyor; tur içeriği saklanmadığı için yeniden
hesaplanamazlar.

Göç 012 ile düzeltildi, canlıda doğrulandı: dört seviyede antrenman
turu gönderildi, hepsi çalışkanlık tablosuna düştü.

Ayrıca kayıt hatası yanıtına Postgres hata **kodu** eklendi. Kodsuz
"sunucu hatası" yanıtı canlıda hiçbir şey anlatmıyordu; bu hatayı
bulmak da ancak kod görünür olunca mümkün oldu.

## 2026-10-08 - Kelime turunda çekimli biçimler kabul ediliyor

Sözlük Zemberek'in kök listesinden üretiliyor: "kitap" vardı, "kitabı"
yoktu. Oyuncunun bildiği bir kelimenin reddedilmesi kelime oyununda en
can sıkıcı an.

Bütün çekimleri listeye eklemek listeyi üç yüz binin üzerine çıkarır ve
pakete birkaç megabayt bindirirdi. Oysa çekim bir **kural**: artık
kelimenin sonundan tanınan ek soyulup kalan gövde sözlükte aranıyor,
gerekirse üç kez. "kitabında" → "kitabın" → "kitab" → ünsüz yumuşaması
geri alınır → "kitap".

Yöntem bilerek cömert: bazen olmayan bir çekimi de kabul edebilir. Bir
kelime oyununda fazladan kabul etmenin bedeli, haklı bir cevabı
reddetmenin bedelinden çok küçük.

**Yan bulgu:** sözlük üretilirken iki harfli kökler eleniyordu ("ev",
"su", "el"). En kısa CEVAP üç harf ama sözlük cevapları değil kökleri
tutuyor; "evde" ancak "ev" listedeyse doğrulanabiliyor. İki harfliler
listeye alındı, çözücünün alt sınırı ayrıca üç harfte tutuldu.

## 2026-10-08 - Kelime turu lige bağlandı

Kelime turu artık puan kazandırıyor: Sıralamalar ekranında kendi
tabloları var ve puanı sunucu veriyor.

### Günün Kelime Turu

Kelime turu ikiye ayrıldı: **Günün Turu** lige işler, **Antrenman**
işlemez (kural 4'ün kelime karşılığı). Günün turunda harfler tarihten
türeyen tohumla üretiliyor — herkes aynı harfleri alıyor ve günde bir
kez oynanıyor.

### Doğrulama sunucuda

Yeni `kelime-gonder` Edge Function'ı geldi. İstemcinin "şu kelimeyi
buldum, şu kadar puan aldım" demesi yetmiyor: sunucu tohumdan harf
havuzunu yeniden üretiyor, kelimeyi sıfırdan doğruluyor ve puanı kendi
hesaplıyor (kural 2).

Reddettikleri canlıda denendi: uydurma tohum, geçmiş tarih, sözlükte
olmayan kelime, şişirilmiş kalan süre ve aynı turun ikinci kez
gönderilmesi — hepsi geri çevriliyor.

`tur-gonder` ile birleştirilmedi: o fonksiyon baştan sona sayı turuna
özgü (adım zinciri, jokerler). Birleştirmek canlıdaki sayı turunu
riske atmak olurdu.

### Veritabanına dokunulmadı

Göç gerekmedi. Lig tabloları ve tetikleyici baştan `oyun` sütunuyla
yazılmış; kelime satırı eklenince günlük, haftalık ve aylık tablolar
kendiliğinden doluyor. Faz 3'te alınan "platform oyunu bilmesin"
kararının karşılığını burada aldık.

### Sıralamalar ekranı

Günlük / Haftalık / Aylık / Antrenman sekmelerinin üstüne bir **oyun
seçici** eklendi: Sayı Turu ↔ Kelime Turu. Düello ve arena yalnızca
sayı turunda olduğu için o sekmelerde görünmüyor. Boş tablodaki davet
de seçili oyuna götürüyor.

### Not: seri tek sayaç

Günlük seri (streak) oyuna göre ayrılmadı. Hangi oyunu oynarsan oyna
"bugün oynadın" sayılıyor. Seri, oyuncunun alışkanlığını ölçüyor;
oyun başına ayrı seri tutmak iki ayrı alışkanlık icat etmek olurdu.

## 2026-10-08 - Kelime turu oynanabilir

Faz 6'nın arayüzü geldi: kelime turu artık telefonda açılıp
oynanabiliyor. Ana ekranda Arena'nın altında yeşil bir giriş var.

### Ekran

Harf rafı, yazılan kelime, süre çubuğu, "Sil / Temizle / Bitir".
Harflere dokunarak kelime kuruluyor; dokunulan harf rafta işaretli
kalıyor, tekrar dokununca geri bırakılıyor. Görsel dil sayı turuyla
aynı — aynı taş derinliği, aynı süre çubuğu, aynı sonuç kartı.

**Geçersiz kelime turu bitirmiyor.** Sözlükte olmayan ya da harflerden
yazılamayan bir cevap uyarı veriyor ve oyuncu ekranda kalıyor; sayı
turundaki "yanlış cevap turu kapatmaz" kuralının karşılığı.

**Çözüm ancak tur bitince görünüyor** (kural 8). Oyuncu en uzunu
bulduysa başlık "aynı uzunlukta bir başka çözüm" oluyor; "en uzun
kelime" deyip başka bir kelime göstermek "demek ki bulamadım" gibi
okunuyordu.

### Sözlük sonradan yükleniyor

Kelime listesi yarım megabayt. Sayı turunu oynayan birinin bunu
indirmesi gereksiz; liste ayrı bir parçaya konuldu ve yalnızca kelime
turu açıldığında isteniyor (sıkıştırılmış 131 KB).

### Mimari notu

Kelime turu kendi ekranında yaşıyor; sayı turunun ekranlarına
dokunulmadı. Oyun kurallarının hiçbiri arayüze kopyalanmadı — hangi
kelime geçerli, kaç puan eder, en uzunu hangisi, hepsini
`paketler/oyun-kelime` söylüyor (kural 1).

Kelime turu henüz **tek kişilik**: lige, düelloya ve arenaya
girmiyor. Sunucu doğrulaması da yok; bu yüzden puanı lige işlemiyor
(kural 2'ye uygun — sunucu doğrulamadan puan verilmez).

## 2026-10-07 - Kelime turu gerçek sözlüğe kavuştu

Kelime turu 150 kelimelik geçici bir listeyle çalışıyordu; oynanabilir
değildi. Artık yaklaşık **50 bin kelimelik** gerçek bir Türkçe sözlüğü
var.

### Lisans kararı

TDK sözlüğü telifli, kullanılamazdı. Kaynak olarak **Zemberek**in
Türkçe kök sözlüğü seçildi: Apache License 2.0, ticari kullanıma açık,
tek şartı kaynağı belirtmek. Lisans metni depoda
(`paketler/oyun-kelime/veri/ZEMBEREK-LISANS.txt`).

### Liste nasıl üretiliyor

`araclar/kelime-listesi-uret.mjs` ham sözlüğü oyuna uygun hale
getiriyor: dilbilim etiketleri atılıyor, özel adlar, kısaltmalar,
ünlemler, ikilemeler ve çok kelimeli maddeler ayıklanıyor. Düzenli
**çoğullar** ünlü uyumuna göre ekleniyor — oyuncunun "kitaplar" yazıp
reddedilmesi can sıkıcı olurdu. Diğer çekimler türetilmiyor; ünsüz
yumuşaması doğru yapılmadan üretilen liste uydurma kelimelerle dolardı.

Liste elle düzenlenmiyor, betikle yeniden üretiliyor.

### Çözücü hızlandı

Gerçek sözlükle bir turu kurmak yarım saniye sürüyordu — telefonda bu,
tur açılırken donma demek. Harf sayımı her kelime için yeniden
kuruluyordu; artık bir kez kurulup yeniden kullanılıyor. **Tur başına
yarım saniyeden iki milisaniyeye** indi.

Kabul testi: dört seviyede 200'er tur üretiliyor ve hepsinin
çözülebilir olduğu doğrulanıyor — sayı turundaki "her tur tam çözümlü"
güvencesinin kelime karşılığı.

## 2026-10-07 - Arena turu oyuncuya vakit bırakıyor

Arenada tur 60 saniyeydi ama pratikte 8–12 saniyede bitiyordu: boş
koltuklara güçlü botlar oturuyordu ve **ilk tam isabet turu kapattığı**
için dört bottan biri hemen hedefi bulup turu kapatıyordu. Oyuncu cevabı
görse bile işlemleri yapmaya yetişemiyordu.

İki değişiklik:

- **Arena botları zayıfladı.** Dört bot koltuğunun en fazla biri güçlü;
  gerisi çırak ve acemi. Düelloda tek rakip olduğu için güçlü bot sorun
  değildi, arenada dört rakip var.
- **Botun cevabı için taban süre.** Bir bot turu, tur süresinin yarısı
  geçmeden kapatamıyor (60 sn'lik turda 30 sn). Bot hile yapmıyor,
  yalnızca acele etmiyor.

Ayrıca aynı arenada üç tane "İbrahim K." görünebiliyordu; bot adları
artık tekrar etmiyor.

## 2026-10-07 - Arena sıralaması (madalya tablosu)

Arena oynanıyordu ama hiçbir yere yazılmıyordu; yarışın bir sicili yoktu.
Sıralamalar ekranına altıncı sekme olarak **Arena** eklendi.

### Neden ELO değil madalya tablosu

Düelloda ELO var çünkü iki kişilik maçın sonucu "kim daha iyi" sorusunu
doğrudan cevaplıyor. Arena beş kişilik bir yarış ve oradaki asıl ödül
podyum. Bu yüzden arena tablosu bir madalya tablosu: önce altın, sonra
gümüş, sonra bronz, en son toplam puan — olimpiyat tablosu gibi.
Seviyeye göre ayrılmıyor; arena madalyası tek bir sicil.

### Bota karşı kazanılan podyum sayılmaz

Arena boş koltukları botla dolduruyor. Tek başına katılan oyuncu her
seferinde dört bota karşı yarışır ve madalya toplardı; tablo birkaç
günde anlamsızlaşırdı. Sonuç **yalnızca en az iki gerçek yarışçı varsa**
işleniyor — düellodaki "bota karşı derece değişmez" kuralının arena
karşılığı.

### Veri

Yeni tablo `arena_derece` (göç 011, canlıda uygulandı): oyuncu başına
arena sayısı, altın, gümüş, bronz ve toplam puan. Okuma herkese açık
(sıralama ekranı), yazma yalnızca Edge Function'da.

Arena bitirme güncellemesi artık değiştirdiği satırı geri istiyor;
iki istek aynı anda bitirmeye çalışsa bile madalyalar bir kez yazılıyor.

### Yol boyunca bulunan hata

Yarıştan çıkan oyuncu çıktığı arenaya geri yapışıyordu: "süren arena"
araması ayrılmış koltuğu da sayıyordu, bu yüzden yeni arenaya
giremiyordu. Canlı denemede ortaya çıktı ve düzeltildi.

## 2026-10-07 - Düello ve arena ekranları oyun gibi görünüyor

Bekleme ve sonuç ekranları düz metin kutularıydı; bildirim ekranı gibi
duruyordu. Oysa burası bir oyun.

### Bekleme ekranı

- **Sahne kartı:** kilitlenen cevap büyük rakamla, oyunun kendi yazı
  tipiyle. Taşlara verdiğimiz derinliğin aynısı bu yüzeye de verildi:
  üstten ışık, gövde eğimi, altta gölge.
- **Uzaklık çubukları:** "72 fark" bir sayı; yan yana iki sayıyı
  karşılaştırmak için okumak gerekiyor. Çubuk aynı bilgiyi bakışta
  veriyor — kim hedefe yakın. Tam isabet altın renkte.
- **Nabız:** "Rakip oynuyor…" yazısı hafifçe nefes alıyor; ekranın
  çalıştığını söyleyen tek hareket.
- **Senin yolun:** kendi adım zincirin tahtaya el yazısıyla yazılıyor,
  sonuç ekranındaki gibi.
- **Tur saati** rakam yerine çubukla.

### Beklerken doğru çözüm gösteriliyor

Cevabını kilitleyen oyuncu artık o turda hiçbir şey değiştiremiyor;
beklerken doğru yolu görmesi oyunu öğretiyor. Çözüm **sunucudan
gelmiyor**, tohumdan istemcide üretiliyor — tahtayı da zaten aynı
tohumdan kuruyoruz.

> Not: kural 8 "tur bitmeden çözüm gösterilmez" diyor. Burada tur
> teknik olarak açık (rakip hâlâ oynuyor) ama gösterilen oyuncu
> cevabını kilitlemiş durumda, yani kendi turunu bitirmiş sayılır ve
> bu bilgiyle sonucunu değiştiremez. Proje sahibinin isteğiyle
> eklendi; geri alınması tek satır.

### Sonuç ekranları

- **Düello:** sonuç bir cümle değil, bir skor tabelası — iki sayı
  büyük ve yan yana. Tur özeti kart dizisine döndü; her turun solunda
  turu kimin aldığını söyleyen madeni para işareti var.
- **Arena:** gerçek bir podyum çizildi — birinci yüksekte durur. Altında
  kendi sıran vurgulu kartta.

### Küçük düzeltme

Hiç işlem yapılmadan cevap kilitlenince uzaklık hedefin kendisine eşit
çıkıyor ve ekran "665 fark · hedef 665" diyordu. Artık "hiç işlem
yapmadın" yazıyor.

360 birim + 32 e2e testi yeşil.

## 2026-10-07 - Faz 5 katman 3: arena arayüzü — Faz 5 oynanabilir

Arenanın görünen yüzü. Artık baştan sona oynanıyor.

### Tahta üçüncü kez yazılmadı

Oyun ekranı artık düello ve arena kiplerinin ikisini de destekliyor.
Taşlar, animasyonlar, işlem seçimi, süre çubuğu ve taşma düzeltmesi tek
kod. Üçüncü bir kopya çıkarılsaydı bir düzeltmenin üç yerden birinde
unutulması kesindi.

Arena kipinde üstte **beş yarışçının canlı listesi** var: baş harf
dairesi, ad, puan ve hedefe uzaklık. Liste anlık uzaklığa göre
sıralanıyor — kim önde, bir bakışta görünüyor. Yayınlanan tek bilgi yine
uzaklık (kural 8).

### Ekranın dört hâli

Seviye seçimi (önce seviye, sonra yarış), koltukların dolmasını bekleme,
yarış ve podyum. Podyumda ilk üçe madalya, kendi satırın vurgulu;
yarıştan çıkan en sonda ve madalyasız.

### Canlı yayın yerine yoklama

Düelloda rakibin uzaklığı için Realtime aboneliği var. Arenada durum
çağrısı zaten iki saniyede bir yapılmak **zorunda** — yarışı ilerleten
de o çağrı. Aynı veriyi bir de ayrı kanaldan dinlemek ikinci bir
doğruluk kaynağı yaratmaktan başka işe yaramazdı.

### Testlerin bulduğu iki hata

1. **Bitmiş arena yeniden açılınca podyum boş geliyordu.** Podyum
   yalnızca arenayı o an bitiren istekte hesaplanıyordu; sonradan açan
   oyuncu boş bir liste görüyordu.
2. **Bitmiş arena "sürüyor" sayılabiliyordu** ve oyuncu podyum
   ekranında kilitli kalıyordu. Durum süzgeci artık gömülü sorguya
   bırakılmıyor, açıkça uygulanıyor.

### Testler

4 yeni e2e senaryosu: iki oyuncunun katılması ve boş koltukların botla
dolması, cevabın kilitlenmesi, misafir kapısı, kurulumdaki arena
düğmesi. 360 birim + 32 e2e testi yeşil.

### Faz 5'te kalan

Arena sıralaması (lig tablosu), kupa ve rozetler, FCM bildirimleri.

## 2026-10-07 - Faz 5 katman 2: arena sunucusu

Arenanın sunucu tarafı kuruldu. Üç Edge Function canlıda, göç uygulandı.

### Kuyruk tablosu yok — bekleyen arenanın kendisi kuyruk

Düelloda ayrı bir kuyruk tablosu var, çünkü iki kişi eşleşene kadar
ortada maç yoktu. Arenada ilk gelen arenayı "bekliyor" durumunda
açıyor, sonrakiler ona katılıyor. Ayrı kuyruk tutmak aynı bilgiyi iki
yerde saklamak olurdu.

Beş koltuk dolunca ya da **on saniye** geçince arena botlarla
tamamlanıp başlıyor. Oyuncu boş ekranda bekletilmiyor.

### Botların gücü aynı değil

Beş aynı güçte bot bir yarışı yapay gösterirdi. Koltuk numarasına göre
farklı güçte botlar oturuyor; arena karışık seviyede bir yarış oluyor.
Her botun kendi tohumu var, yoksa beşi aynı anda aynı cevabı verirdi.

### Düellodan devralınanlar

- Maç durumu her istekte kayıtlardan sıfırdan kuruluyor; sunucu bellekte
  durum tutmuyor.
- Tur, süre dolunca ya da yarışta kalan herkes cevabını kilitleyince
  kapanıyor.
- Tur erken kapanırsa sıradaki tur şimdi başlıyor; süre dolduğu için
  kapandıysa zaman çizgisi korunuyor.
- Bot hamleleri kilitli yazılıyor, zincirleri de doğrulanıyor — bot
  ayrıcalıklı değil.
- Yarışanlara giden tek bilgi uzaklık (kural 8).

### Düellodan farkı

**Yarıştan çıkan arenayı bitirmiyor.** Kalanlar yarışmaya devam ediyor;
ayrılan podyumda en sonda ve madalyasız.

### Doğrulama

16 yeni test (veritabanı taklidiyle): koltukların botla dolması,
botların gecikmeden önce susması, turun süre ya da kilitle kapanması,
puanın sıraya göre dağılması, terk edilen arenanın sonuna kadar
ilerlemesi ve podyum.

Canlıda da denendi: iki test hesabı aynı arenaya katıldı, bekleme
dolunca üç botla başladı, gönderim doğrulandı, uydurma zincir
reddedildi, yarıştan çıkış çalıştı.

360 birim testi yeşil.

### Sırada

Arena arayüzü: bekleme ekranı, beş yarışçının canlı uzaklığı, podyum.

## 2026-10-07 - Faz 5 ve Faz 6 başladı: arena ve kelime turu çekirdekleri

İki fazın da beyni yazıldı. İkisi de saf ve test edilebilir; ağ, sunucu
ve arayüz henüz yok.

### Faz 6 — Kelime turu

`paketler/oyun-kelime` kuruldu ve `TurSaglayici` arayüzünü uyguluyor:
harf havuzu üretimi, cevap doğrulama, puanlama ve en uzun kelimeyi
bulma.

**Faz 6'nın asıl sınavı geçildi: platform koduna tek satır dokunulmadı.**
Ne `uygulama/` ne `sunucu/` altında bir değişiklik var — yalnızca yeni
paket ve onu tanıtan iki yol tanımı. Bu, arayüzün gerçekten oyundan
bağımsız olduğunun kanıtı.

Kararlar:

- **Havuz önce bir kelime seçilerek kuruluyor.** Rastgele harf dağıtıp
  "umarım kelime çıkar" demek oynanamaz turlar üretirdi. Sözlükten bir
  çekirdek kelime seçiliyor, harfleri havuza konuyor, kalanı Türkçe harf
  sıklığına göre dolduruluyor. Böylece her havuzda en az bir uzun
  kelimenin bulunduğu garanti — sayı turundaki "her tur tam çözümlü"
  güvencesinin karşılığı. Bir test bunu 240 tur üzerinde doğruluyor.
- **Türkçe büyük/küçük harf ayrı ele alınıyor.** `toLowerCase()` tek
  başına yanlış: 'I' İngilizce kurallarına göre 'i' olur, Türkçe'de 'ı'
  olmalı. Sözlük araması her zaman Türkçe yerelle yapılıyor.
- **Puan sayı turuyla aynı ölçekte.** İki oyun aynı lig yapısını
  kullanıyor; ölçekler ayrışsaydı tablolar kıyaslanamazdı.

> **Sözlük kaynağı henüz seçilmedi.** Pakette birkaç yüz kelimelik
> GEÇİCİ bir liste var; testleri ve geliştirmeyi yürütüyor, gerçek
> sözlüğün yerini tutmuyor. Sözlük dışarıdan veriliyor: kaynak
> değiştiğinde oyun kuralları değişmeyecek. Bu bir lisans kararı —
> TDK sözlüğü telifli.

### Faz 5 — Arena

`paketler/cekirdek/src/arena.ts`: 5 kişilik eşzamanlı yarışın akışı.
Sıra yok, herkes aynı anda oynuyor; ilk tam isabet turu kapatıyor,
kimse bulamazsa sıralama hedefe uzaklığa göre yapılıyor.

Kararlar:

- **Tur puanı sıraya göre azalarak dağılıyor** (5·3·2·1·0). Yalnızca
  kazanana puan verilseydi 3. ile 5. arasında fark kalmaz, ortalarda
  oynayanın çabası görünmezdi.
- **Bir kişinin ayrılması yarışı bitirmiyor** — düellodan farkı bu.
  Ayrılan podyumda en sonda ve madalyasız; yarışı bitirmeyen podyuma
  çıkmaz.
- **Beraberlik toplam uzaklıkla bozuluyor:** aynı puanı toplayan iki
  oyuncudan hedefe daha çok yaklaşan önde. O da eşitse sıra sabit
  kalıyor; aynı girdi her makinede aynı podyumu veriyor.
- Rakibe giden tek bilgi yine uzaklık (kural 8); olay tiplerinde adım,
  zincir ya da kelime alanı yok.

### Testler

53 yeni test (30 kelime, 23 arena). Toplam 344 birim testi yeşil.

### Sırada

Her iki faz da şu an yalnızca beyin: veritabanı şeması, Edge Function'lar
ve arayüz yazılmadı. Kelime turu için ayrıca gerçek sözlük gerekiyor.

## 2026-10-07 - Düello: önce seviye sonra rakip, bekleme ekranında kendi yolun

Telefonda yapılan testten çıkan iki nokta.

### Sıralama ters duruyordu

Düello düğmesi seviye seçicinin ÜSTÜNDE duruyordu. Oyuncu daha
seviyesini seçmeden düelloya giriyor, hangi seviyede oynadığını
bilmiyordu — düğme o an Kurulum'da ne seçiliyse onu sessizce
kullanıyordu.

Seviye artık düellonun kendi ekranında ve "Rakip bul"dan önce
geliyor: önce seviye, sonra rakip. Kurulum'daki kart yerinde kalıyor
(kaydırmadan görünür olması gerekiyordu), ama artık "seviyeyi orada
seçersin" diyor.

**Kilitli seviyeler düelloda da kilitli.** Adres satırından kilitli bir
seviye istenirse açık olan en üst seviyeye düşülüyor — düello, tek
kişilik ilerlemeyi atlamanın yolu olmamalı.

### Bekleme ekranı artık nasıl ulaştığını gösteriyor

"1090 fark" tek başına soğuk bir sayıydı. Cevabını kilitleyen oyuncu
artık kendi adım zincirini ve hedefi görüyor: hem bekleme boş geçmiyor
hem nerede saptığı anlaşılıyor.

Gösterilen yalnızca **kendi** zinciri. Rakibin adımları ne ekranda var
ne sunucudan geliyor (kural 8).

291 birim + 28 e2e testi yeşil.

## 2026-10-07 - Düello: "Bitir" çalışmıyordu, uzun sayılar taşıyordu

### "Bitir"e basınca hiçbir şey olmuyordu

Tam isabet bulamayan oyuncu "Bitir"e bastığında ekran hiç değişmiyordu.
Tur, süresi dolana kadar açık kalıyor; oyuncu bekliyor, bir şey olmuyor
ve oyunu bozuk sanıyordu.

Kural değişmedi — yaklaşık cevap turu tek başına kapatmaz, tam isabet
kapatır. Değişenler:

- **Düğme ne yaptığını söylüyor:** "Bitir" yerine "Cevabı kilitle".
- **Kilitleyen oyuncu bekleme ekranına geçiyor.** Kendi farkı, rakibin
  durumu, kalan süre ve skor orada; ekran artık cevap veriyor.
- **İki taraf da kilitlediyse tur hemen bitiyor.** Beklenecek kimse
  kalmıyor. Bota karşı oynanıyorsa bot kilitli yazıldığı için tur
  genelde anında kapanıyor.
- Bekleme ekranında da "Maçtan çık" var: rakip hiç cevap vermezse
  oyuncu orada kilitli kalmıyor.

### Uzun sayılar taştı

Usta seviyesinde beş-altı haneli ara sonuçlar (26347 gibi) taşın
dışına taşıyor, ekran bozuluyordu. Yazı boyu artık basamak sayısına
göre küçülüyor: kısa sayı büyük ve okunaklı kalıyor, uzun sayı kutuya
sığıyor. Aynı kural hedef ve "en yakın" göstergelerine de uygulandı.

### Yol boyunca çıkan üç hata

1. **Kilit yeni maça taşınıyordu.** Bir maçta cevabını kilitleyen
   oyuncu, rövanşta ya da yeni bir maçta aynı numaralı turda hiç
   oynamadan bekleme ekranında buluyordu kendini. Kilit artık hem maça
   hem tura bağlı.
2. **Sıralamada eski sorgu yenisini eziyordu.** Ekran açılırken oyuncu
   kimliği henüz bilinmediği için ilk sorgu kimliksiz gidiyor, kimlik
   gelince ikincisi atılıyordu. İki yanıt yarışa girdiğinde eski yanıt
   kazanabiliyor ve kendi satırın sebepsiz yere vurgusuz kalıyordu.
   Artık yalnızca en son sorgunun yanıtı ekrana yazılıyor.
3. **Rakip kartı ilk iki saniye eksik duruyordu.** Maç kurulur
   kurulmaz durum bir kez soruluyor; rakibin adı ve derecesi hemen
   görünüyor.

### Testler

Boş durum testleri canlı veritabanına bağımlıydı ("hiç oynanmamış
seviye" varsayımı) ve veritabanı dolunca kırmızıya döndü. Artık sorgu
yanıtı testin içinde boşa sabitleniyor; test, veritabanının o anki
hâlini değil boş durumun kendisini sınıyor.

Düello test yardımcısı da sağlamlaştırıldı: oturum süreç boyunca bir
kez alınıyor (çok sayıda giriş isteği Supabase tarafından düşürülüyordu)
ve kalan maçlar temizlenirken ekranın her hâli ele alınıyor.

291 birim + 26 e2e testi yeşil.

## 2026-09-06 - Sıralamalar: düello tablosu, boş durum daveti, zengin satırlar

### Düello sıralaması eklendi

Düello canlıydı ama sonuçları hiçbir yere işlemiyordu. Beşinci sekme
geldi ve Antrenman'ın önüne kondu.

- Sıralama ELO derecesine göre; her satırda derece, galibiyet–mağlubiyet
  ve kazanma yüzdesi var.
- **Seviyeye göre ayrılmıyor**: düello derecesi tek bir sayı, oyuncu
  hangi seviyede oynarsa oynasın aynı dereceyi taşıyor. Bu sekmede
  seviye seçici gizleniyor.
- **Bota karşı maçlar sayılmıyor.** Bunun için ayrı bir süzgeç
  gerekmedi: derece zaten yalnızca iki gerçek oyuncu arasındaki maç
  bitince yazılıyor. Sonuç ekranında "derecen değişmedi" diyorsak tablo
  da bunu yansıtıyor.
- Hiç düello oynamamış oyuncular listeye girmiyor.

### Boş durum artık davet

"Henüz kimse bu seviyede oynamadı" cümlesi ekranın ortasında tek başına
duruyordu, altı kapkaraydı. Kullanıcı burayı ölü sanıp bir daha
bakmıyordu.

Artık her sekmenin kendi daveti ve **o moda götüren** düğmesi var:
Günün Turu, Düello ve Antrenman. Düğme kullanıcıyı doğru modda açılmış
kurulum ekranına bırakıyor.

### Kendi satırın vurgulanmıyordu — düzeldi

Sıralama sorguları oyuncu kimliğini hiç çekmiyordu, bu yüzden "bu satır
benim" bilgisi her zaman yanlıştı ve kendi satırın listede
vurgulanmıyordu. Şimdi vurgulu ve "(sen)" işaretli. İlk 100'ün dışında
kalınca listenin altında ayrıca gösterilmesi zaten çalışıyordu.

### Satırlar zenginleşti

İlk üçte madalya, sonrasında sıra numarası; adın yanında baş harf
dairesi (rakip kartındakiyle aynı biçim); XP seviyesi rozeti.

### Kalan süre

Son 24 saatte gri metin yerine vurgulu uyarı: "⏳ Son gün — 9 saat 29 dk
kaldı".

### Açıklama sekmeyle değişiyor

"Çalışkanlık tablosu" notu yalnızca Antrenman'da geçerliydi ama diğer
sekmelerde de duruyor izlenimi veriyordu. Her sekmenin kendi açıklaması
yazıldı ve bir testle sabitlendi.

291 birim + 23 e2e testi yeşil.

## 2026-09-06 - Düello: bot dengelendi, iki çökme hatası, ekranlar yeniden

Canlı kullanımdan gelen beş sorun. İkisi çökme, biri denge, ikisi tasarım.

### 1. Bot yeni oyuncuyu kaçırıyordu

Isınma seviyesinde ilk düello 1-4 kaybediliyordu. İlk düellosunu
kaybeden oyuncu bir daha düello açmıyor — bu, jokerlerden önceki
"hiçbir şey yapamadan bitti" sorununun düello hâli.

Yeni ve bilerek çok zayıf bir profil eklendi (`cirak`): nadiren tam
isabet yapar, geç cevap verir, yaklaşık cevabı da uzaktır. Kurallar:

- **İlk üç düelloda her zaman en zayıf bot** — oyuncu ne kadar iyi
  olursa olsun. Amaç ilk maçın kazanılması.
- Dördüncüden itibaren dereceye göre kademe.
- **Üst üste iki kayıptan sonra bir kademe düşülür.** Kaybetmeye
  başlayan oyuncuyu daha da zorlamak, oyundan koparmanın en hızlı yolu.

Oyuncuya hiçbiri söylenmiyor. Karar mantığı oyun paketinde ve test
ediliyor (10 test).

### 2. Çökme: düello ekranı bomboş açılıyordu

Sonuç ekranı için eklenen hesaplamalar koşullu dönüşlerin ARDINA
konmuştu. React'te kancalar her çizimde aynı sırayla çalışmak zorunda;
sıra değişince bileşen komple çöküyor ve ekran bembeyaz kalıyordu.
Kancalar en üste alındı.

### 3. "Failed to fetch" — kök neden bulundu

Bot maçlarında botun çözücüsü **her durum yoklamasında yeniden
çalışıyordu** — iki saniyede bir. Güçlü profillerde çözücü 600 ms'ye
kadar işlemci harcıyor; Edge Function'ın istek başına işlemci bütçesi
bunu kaldırmıyor ve fonksiyon zaman zaman öldürülüyordu. Tarayıcıya
yanıt hiç dönmediği için ekranda İngilizce "Failed to fetch" çıkıyordu.

Artık botun planı **tur başına bir kez** hesaplanıp yazılıyor; cevabı
yine gecikmesi dolunca görünür oluyor (satır ileri tarihli yazılıyor ve
zamanı gelene kadar yok sayılıyor).

Ayrıca istemci tarafı sertleştirildi: **hiçbir hata mesajı İngilizce
değil**, ağ hatası tek bir Türkçe cümleye çevriliyor ("Bağlantı
kurulamadı. Tekrar dene.") ve ekranda "Tekrar dene" düğmesi çıkıyor.
Geçici hatalarda kullanıcıya hiç gösterilmeden bir kez yeniden deneniyor
ve isteklerin zaman aşımı var.

### 4. Düello ana sayfada görünmüyordu

En ilgi çekici özellik sayfanın en altındaydı. Artık mod seçicinin
hemen altında, kaydırmadan görünen belirgin bir kart.

### 5. Ekranlar

- **Rakip kartı yeniden tasarlandı:** baş harf dairesi, okunur ad ve
  rakibin gücü ("1240 puan · 8 galibiyet"). Durum satırı kesilmiyor;
  hamburger menü artık üstüne binmiyor.
  *Bot için galibiyet sayısı gösterilmiyor* — bot hiç maç oynamadı,
  uydurma bir sicil göstermek oyuncuyu kandırmak olurdu. Botun
  "derecesi" ise uydurma değil, gücünün karşılığı.
- **Oyun ekranındaki boşluk kapandı:** düelloda taşlar ve işlemler
  büyüdü, geçmiş kutusu kalan yeri dolduruyor. "Maçtan çık" artık
  sayfanın kendi akışında, kesik değil.
- **Sonuç ekranına tur tur özet:** her turun hedefi, iki tarafın ne
  kadar yaklaştığı ve turu kimin aldığı. Hedefler sunucudan gelmiyor,
  tohumdan yeniden üretiliyor (kural 3).
- **Kaybedince yapıcı bir satır:** "3. turda 2 fark kalmıştı."

291 birim + 17 e2e testi yeşil.

## 2026-09-06 - Faz 4 tamam: rövanş, özel oda, maçtan çıkış

Faz 4'ün kalan parçaları. Düello artık baştan sona oynanabiliyor.

### Rövanş

Biten maçtan tek dokunuşla yeni maç. İki oyuncu da aynı anda "rövanş"
derse iki maç kurulurdu — eşleştirmede yaşadığımız yarışın aynısı. Orada
simetriyi kırarak çözmüştük; burada veritabanı kısıtı daha basit oldu:
bir maçtan yalnızca bir rövanş açılabiliyor, ikinci istek reddedilip var
olan maça katılıyor.

Rövanşta **taraflar yer değiştiriyor**. Sebebi adalet: tam isabet
eşitliğinde önce bildiren taraf turu aldığı için A tarafı bir miktar
avantajlı; sırayla oynanınca dengeleniyor.

### Özel oda

Beş karakterlik kod üretiliyor, arkadaş kodu girip katılıyor. Kod
alfabesinde karışabilen harf ve rakamlar yok (O/0, I/1) — telefonda
sesli söylenebilmeli.

Oda maçın kendisi değil, ayrı bir kayıt: maç ancak iki taraf belli
olunca kuruluyor. Odayı yalnızca kuran görebiliyor; oda listesi herkese
açık olsaydı kod deneyerek yabancı odalara girmenin yolu açılırdı.
Bekleyen oda yarım saatte ölüyor.

### Maçtan çıkış — testlerin ortaya çıkardığı eksik

Maç sürerken çıkmanın **hiçbir yolu yoktu**; oyuncu maç bitene kadar
kilitliydi. Testleri birbirinden bağımsız hale getirmeye çalışırken
fark edildi.

Artık "Maçtan çık" var, onay soruyor ve **terk eden kaybediyor** —
çıkmak, kaybetmek üzere olan maçtan bedelsiz kurtulmanın yolu olmamalı.
Çekirdekteki "ayrıldı" kuralının sunucu karşılığı.

### Kopan bağlantıdan dönüş — bir regresyon yakalandı

Düello ekranına kip seçimi (rakip bul / arkadaşınla oyna) eklenince,
sekmesini yenileyen oyuncu maçına değil seçim ekranına düşmeye başladı.
Test yakaladı.

Artık ekran açılır açılmaz "süren maçım var mı?" diye soruluyor ve
oyuncu maçına geri dönüyor. Bu sorunun kuyruğa **yazmayan** ayrı bir
biçimi eklendi; normal arama çağrısı kullanılsaydı düello ekranına
bakmak bile oyuncuyu sıraya sokardı.

### Testler

5 yeni e2e senaryosu: özel oda, rövanş, kopan bağlantıdan dönüş ve iki
maç senaryosu. Testler artık kendi kendini temizliyor — kalan maç varsa
terk ediliyor, böylece sıraya bağımlı olmuyorlar.

281 birim + 17 e2e testi yeşil.

### Faz 4'te geriye kalan

FCM ile düello bildirimleri (rakip bulundu, sıra sende). Kapalı test
başlayınca gerçek cihazlarda denenmeli.

## 2026-09-06 - Faz 4: ilk gerçek düello oynandı, bir yarış hatası çıktı

Buraya kadar düello parça parça doğrulanmıştı ama uçtan uca bir maç hiç
oynanmamıştı. Test hesapları kuruldu ve iki tarayıcıyla gerçek maç
oynatıldı. **İlk denemede kritik bir hata çıktı.**

### Hata: aynı ikili için iki ayrı maç kuruluyordu

İki oyuncu aynı anda "düello ara" dediğinde her ikisi de rakibinin
kuyruk satırını siliyor ve ikisi de başarılı oluyordu — farklı satırları
sildikleri için. Sonuç: aynı iki oyuncu için **beş milisaniye arayla iki
ayrı maç**. Bir oyuncu bir maçta oynuyor, diğeri ötekinde bekliyordu;
skorlar hiç buluşmuyordu.

Katman 2'de bu yarışı düşündüğümü sanıyordum ama koyduğum koruma yalnızca
"benim seçtiğim rakibi başkası kaptı mı?" sorusunu çözüyordu; simetrik
durumu değil.

Çözüm simetriyi kırmak: maçı **kimliği küçük olan** kurar. Diğeri hiç
kurmaz, bir sonraki yoklamada aynı maça "süren maç" olarak düşer. Kural
baştan belli olunca yarış da kalmıyor. Ayrıca maç kurmadan önce rakibin
başka bir maça girip girmediği de kontrol ediliyor.

### İyi huylu çakışmalar artık hata ekranı açmıyor

Rakip tam isabet yapıp turu kapattığında, o sırada cevap gönderen
oyuncuya "bu tur şu an oynanmıyor" dönüyordu ve ekran hata ekranına
düşüyordu. Bu bir arıza değil, oyunun normal akışı; artık sessizce
yutuluyor ve bir sonraki durum yoklaması ekranı güncelliyor.

### Test hesapları

İki test hesabı kuruldu; kimlik bilgileri `.env.test` dosyasında ve o
dosya repoya girmiyor. **Uygulamanın giriş akışına test kapısı
açılmadı** — hesaplara yalnızca test için parola tanımlandı, oturum
doğrudan tarayıcı deposuna yazılıyor. Dosya yoksa maç testleri sessizce
atlanıyor.

### Ne kanıtlandı

- İki oyuncu gerçekten eşleşiyor (bota düşmeden)
- Maç oynanıyor, turlar ilerliyor, maç bitiyor
- Sonuç iki tarafta da aynı; skorlar birbirinin aynası
- ELO işliyor ve toplam korunuyor (1216 / 1184)
- **Rakibin adımı hiçbir yerden sızmıyor:** ağdan geçen tüm yanıt
  gövdeleri tarandı, adım listesi yok (kural 8)

281 birim + 14 e2e testi yeşil.

## 2026-09-06 - Faz 4 katman 4: düello arayüzü

Düellonun görünen yüzü. Artık oynanabilir bir ekran var.

### Tahta yeniden yazılmadı

Oyun ekranı düello kipini destekliyor. Tahta, taş animasyonları, işlem
seçimi ve süre çubuğu aynı kod; ikinci bir kopya çıkarılsaydı bir
düzeltme birinde yapılıp diğerinde unutulurdu. Düello kipinde üstte tur
ve skor duruyor, altında rakip göstergesi.

**Rakip göstergesinde tek bilgi var: uzaklık.** "hedefe 12 kaldı" ya da
"tam isabet yaptı". Hangi taşı kullandığı, kaç adım attığı hiç
gelmiyor — sunucu da zaten göndermiyor (kural 8).

**Düelloda joker yok.** Reklam izleyebilen ya da hak biriktiren oyuncu
rakibine karşı avantaj kazanmamalı.

### İlerleme rakibe nasıl gidiyor

Oyuncu hedefe yaklaştıkça sunucuya bildiriliyor, sunucu doğrulayıp
yazıyor, rakip canlı yayından görüyor. Bildirim yalnızca en iyi değer
**iyileştiğinde** gidiyor; her hamlede gitseydi hedeften uzaklaşan
hamleler rakibin göstergesini zıplatırdı.

### Ayrı rota

Düello, Kurulum'un mod seçicisine üçüncü bir kutu olarak değil ayrı bir
rota olarak eklendi. Düello tek kişilik akışın parçası değil: rakip,
derece ve canlı bağlantı gerektiriyor; mod seçicisine eklemek tek
kişilik akışı da karmaşıklaştırırdı. Kurulum'un altındaki düğme seçili
seviyeyle düelloya götürüyor.

Misafir düelloya giremiyor — rakip ve derece hesaba bağlı.

### Testler

3 e2e senaryosu: düello düğmesinin seçili seviyeyle doğru yere
götürmesi, misafirin durdurulması, vazgeçince ana sayfaya dönülmesi.
Toplam 281 birim + 12 e2e testi yeşil.

### Henüz yapılmadı

- **Gerçek maç testi.** İki kimlikli oyuncu ve canlı bağlantı gerektiren
  test, hesap altyapısı kurulunca yazılacak. Şu ana kadar sunucu
  mantığı veritabanı taklidiyle, arayüz de kimliksiz kısmıyla
  doğrulandı — ama uçtan uca bir maç henüz oynanmadı.
- Rövanş, özel oda ve bağlantı kopmasında geri dönme akışının arayüzü.

## 2026-09-06 - Faz 4 katman 3: bot oynuyor, maç kendi kendine yürüyor

Katman 2'de "bot maçı kuruluyor ama bot oynamıyor" ve "kimse
göndermezse tur ilerlemiyor" diye bırakılan iki eksik kapandı. Düello
artık kimse dokunmasa da doğru yere gidiyor.

### Bot oynuyor

Bot artık her turda gerçekten hamle yapıyor. Çözümü hazır almıyor:
kendi çözücüsünü profiline göre sınırlı süreyle çalıştırıyor — Faz 1'den
gelen davranış korundu. Botun zinciri de tıpkı insanınki gibi sunucuda
doğrulanıyor; bot ayrıcalıklı değil, hatalı zincir üretirse turu
kaybediyor.

**Botun planı artık tohumlu.** Sunucu maç durumunu bellekte tutmuyor,
her istekte kayıtlardan yeniden kuruyor; botun hamlesi de bu yeniden
kurmanın parçası. Plan gerçek rastgelelikle üretilseydi her istekte
başka bir cevap çıkar, bot bir turda hem oynamış hem oynamamış
görünürdü. Tohumlu olunca kim ne zaman sorarsa sorsun aynı cevap
geliyor.

Bot gecikmesi dolmadan cevabı görünmüyor. Anında cevap veren bot makine
gibi hissettirir; oyuncu yenildiğini değil kandırıldığını düşünür.

### Turlar kendiliğinden ilerliyor

Yeni `duello-durum` ucu maçın durumunu döndürürken maçı olması gereken
yere de taşıyor: botun sırası geldiyse oynatıyor, süresi dolan turları
kapatıyor, maç bittiyse dereceleri güncelliyor. İlerletme mantığı
`duello-ortak.ts` içinde; `duello-gonder` de aynı yerden çağırıyor, iki
kopya yok.

**Turun saati gerçek zamandan yürüyor.** Tur tam isabetle erken
kapandıysa sonraki tur şimdi başlıyor; süresi dolduğu için kapandıysa,
sonraki tur o turun bittiği anda başlamış sayılıyor — yani geçmişte.
İlk yazımda sonraki tur her durumda "şimdi" başlıyordu ve iki oyuncu da
uzaklaşınca maç her çağrıda ancak bir tur ilerliyor, kimse dönmezse hiç
bitmiyordu. Test bunu yakaladı.

### Testler bir hata daha yakaladı

Maç bitişi ile derece güncellemesi ayrı adımlardı; iki istek aynı anda
maçı bitirmeye çalışırsa derece iki kez yazılabilirdi. Artık derece
yalnızca maçı gerçekten bitiren istek tarafından yazılıyor.

Sunucu mantığı için veritabanının yerine geçen bir taklitle 14 test
yazıldı: botun oynaması, gecikmeden önce susması, süresi dolan turun
kapanması, maçın beş turda bitmesi, bota karşı derecenin değişmemesi ve
derecenin iki kez yazılmaması. Toplam 281 test yeşil.

### Sırada

Düello arayüzü, canlı yayın bağlantısı, bağlantı kopması toleransının
kalan kısmı, rövanş, özel oda ve iki tarayıcılı e2e testi.

## 2026-09-06 - Faz 4 katman 2: eşleştirme ve maç sunucusu

Düellonun sunucu tarafı kuruldu. İki Edge Function canlıda.

### Şemada bir eksik kapandı (göç 007)

Maçın hangi turda olduğu ve turun ne zaman başladığı şemada yoktu. O
bilgi olmadan "süre doldu" kararını yalnızca istemci verebilirdi — yani
oyuncu turu istediği kadar uzatabilir ya da rakibi lehine erken
kapatabilirdi. İki sütun eklendi; karar artık sunucunun saatinde.

### `duello-ara` — eşleştirme

Oyuncunun derecesini okur (yoksa 1200 ile açar), kuyruktaki ölü
satırları temizler, uygun rakip arar, bulursa maçı kurar, bulamazsa
kuyruğa yazar ve sekiz saniye sonra bot verir.

- **Derece istemciden gelmiyor.** Gelseydi oyuncu kendini düşük
  gösterip hep zayıf rakiple eşleşirdi. Kuyruğa yazma hakkı da yalnızca
  bu fonksiyonda.
- **Maçın tohumu sunucuda üretiliyor.** İstemciden gelseydi oyuncu
  kendine kolay bulmaca seçerdi.
- **Yarış durumu düşünüldü:** iki oyuncu aynı anda birbirini seçebilir.
  Rakibin kuyruk satırı önce siliniyor ve silmenin gerçekten bize düşüp
  düşmediğine bakılıyor; düşmediyse sıradaki adaya geçiliyor. Böylece
  aynı oyuncu iki maça birden düşmüyor.
- **Süren maç varsa yeni maç kurulmuyor**, mevcut maç dönüyor. Sekmesini
  yenileyen oyuncu maçına geri dönebiliyor — bağlantı toleransının ilk
  parçası.

### `duello-gonder` — turun doğrulanması

Turu tohumdan yeniden üretiyor, zinciri sıfırdan doğruluyor, uzaklığı
kendisi hesaplıyor ve maçı ilerletiyor.

- **Maç durumu her istekte kayıtlardan sıfırdan kuruluyor.** Sunucu
  bellekte durum tutmuyor; iki oyuncunun istekleri hangi sırayla gelirse
  gelsin sonuç aynı oluyor ve "yarım kalmış durum" oluşmuyor.
- Oyuncu yalnızca **aktif** turu gönderebiliyor: geçmiş turu yeniden
  göndermek skoru değiştirmeye çalışmak, ileri turu göndermek sırayı
  atlamak olurdu.
- Aynı turda yalnızca **daha iyi** uzaklık geçiyor.
- Üretim ayarı istemciden alınmıyor — iki oyuncu aynı bulmacayı görmeli.
- Maç bitince ELO güncelleniyor. **Bota karşı derece değişmiyor:** bot
  gerçek rakip değil, kuyruk boşken oyuncuyu ekranda tutan bir dolgu.
  Bota karşı derece kazanılabilseydi sıralamanın anlamı kalmazdı.

Dönüşte rakibin adımları yok; giden tek bilgi uzaklık (kural 8).

### Çekirdeğe eklenenler

Maçı kayıtlardan yeniden kuran saf fonksiyon, tur saati kontrolü ve
maç tohumundan tur tohumu türetme. 9 yeni test (toplam 34).

### Henüz yapılmadı — bilinçli olarak

- **Bot henüz oynamıyor.** Bot maçı kuruluyor ama bot hamle yapmıyor;
  bot sürücüsü sıradaki katmanda.
- **Kimse göndermezse tur ilerlemiyor.** Süre dolduğunda turu kapatacak
  bir süpürücü yok; şu an turu ancak bir gönderim ilerletiyor.
- Arayüz, canlı yayın bağlantısı, rövanş, özel oda ve iki tarayıcılı
  e2e testi sıradaki katmanlarda.

## 2026-09-06 - Faz 4 başladı: düellonun beyni ve veritabanı şeması

Faz 4 tek oturumda bitecek bir iş değil; katman katman kuruluyor. Bu
ilk katman, ağ ve arayüz olmadan test edilebilen çekirdek.

### Düello çekirdeği (`paketler/cekirdek/duello.ts`)

Maç akışı oyundan bağımsız: "beş tur oynanır, tam isabeti ilk bulan turu
kapatır, kimse bulamazsa en yakın kazanır" cümlesinde ne sayı ne harf
geçer. Bu yüzden çekirdekte yaşıyor ve oyuna özgü hiçbir kelime
kullanmıyor — yalnızca "uzaklık 0 ise tam isabet" kuralını uyguluyor
(kural 1). Saf olduğu için aynı akış hem tarayıcıda hem Edge Function'da
çalışacak.

- **ELO:** kazanma beklentisi, derece güncelleme, eşleştirme aralığı.
  Toplam korunuyor — biri ne kazanırsa diğeri onu kaybediyor, havuza
  puan basılmıyor ve sıralama zamanla şişmiyor.
- **Eşleştirme:** aralık beklendikçe genişliyor (±100'den başlayıp
  ±600'e kadar). Küçük oyuncu tabanında sabit dar aralık, kimseyi
  kimseyle eşleştirememek demek. Sekiz saniyede bota düşülüyor.
- **Maç akışı:** saf bir durum makinesi. Tam isabet turu anında
  kapatıyor; süre dolarsa en yakın alıyor; eşitlikte tur berabere;
  beşinci turdan sonra skoru yüksek olan maçı kazanıyor; bağlantısı
  kopup dönmeyen kaybediyor. Kapanmış tura ya da bitmiş maça gelen geç
  olaylar durumu değiştirmiyor.

**Çözüm sızmazlığı tip düzeyinde kuruldu (kural 8):** maç olaylarında
adım, zincir ya da taş alanı yok — sonradan yanlışlıkla eklenemesin
diye. Rakibe giden tek bilgi uzaklık, yani bir sayı. Bir test bunu
durumun tamamını tarayarak doğruluyor.

Ayrıca bildirilen uzaklık geriye gitmiyor: oyuncu hedeften uzaklaşsa da
en iyi değeri kalıyor. Yoksa rakibin gördüğü gösterge zıplar ve tur sonu
kararı oyuncunun son hamlesine bağlı kalırdı.

25 test yazıldı, hepsi yeşil.

### Veritabanı şeması (`sunucu/gocler/006_duello.sql`)

Beş tablo/yapı: derece, eşleştirme kuyruğu, maç, maçın turları ve canlı
yayın. Tasarım kararları:

- **Tur içeriği saklanmıyor, tohum saklanıyor** (kural 3). Beş turun
  tamamı tek tohumdan yeniden üretiliyor; rövanş ve maç tekrarı bedava.
- **Adımlar hiçbir tabloda yok.** Sunucu zinciri doğruluyor, sonucu
  yazıyor, zinciri atıyor.
- **Maçı yalnızca tarafları görebiliyor.** Herkese açık olsaydı rakibin
  maçı dışarıdan izlenip tohumdan çözüm hazırlanabilirdi.
- **Kuyruğa giriş istemciden yapılamıyor:** derece alanı istemciden
  gelseydi oyuncu kendi derecesini uydurup zayıf rakip seçerdi.
- Sekmesini kapatanın kuyrukta kalan satırı için temizlik fonksiyonu.

> **Göç canlıda uygulandı (6 Eylül 2026).** Uygulamadan sonraki güvenlik
> denetimi bir açık yakaladı: kuyruk temizleme fonksiyonu dışarıdan
> çağrılabiliyordu. Postgres yeni fonksiyona çalıştırma hakkını herkese
> otomatik veriyor; yalnızca kullanıcı rollerinden geri almak bunu
> kaldırmıyor. Yani herhangi bir kullanıcı eşleştirme kuyruğunu
> boşaltabilirdi. İkinci bir göçle kapatıldı ve denetim temiz döndü.

### Sırada

Eşleştirme ve maç Edge Function'ları, Realtime bağlantısı, düello
arayüzü, bot entegrasyonu (bot altyapısı Faz 1'den hazır ve zaten
çözümü hazır almıyor), bağlantı kopması toleransı, rövanş ve özel oda,
iki tarayıcıyla gerçek maç oynatan e2e testi.


## 2026-09-05 - Üyelik daveti baştan tasarlandı; iki sessiz hata düzeldi

### Davet: soyut vaat yerine somut kayıp

Eski davet gri bir metin satırıydı: "Üye olursan puanların kalıcı olur."
Soyut, ve tam da o anda ekranda duran gerçek kaybı söylemiyordu. Artık
kart ve içinde **oyuncunun kendi sayısı** geçiyor.

- **Antrenman sonucu:** "114 puanın kaydedilmedi". 3. turdan itibaren ve
  iki turda bir çıkar; ilk iki turda hiç çıkmaz. "Şimdi değil" denince o
  oturumda susar — bıktırmak hiç göstermemekten kötü.
- **Günün Turu sonucu:** "150 puan aldın ama lige işlemedi". Günde tek
  hak olduğu için tek seferlik fırsat: her seferinde ve vurgulu çıkar.
  Konumu puanın hemen altı — önce sayfanın en dibindeydi, paylaşım kartı
  uzun olduğu için oyuncuların çoğu oraya hiç ulaşmıyordu.
- **Lig:** "Sen bu listede yoksun". Liste boş olsa da gösterilir.
- **Kurulum:** seri sayacının yanında "3 günlük serin kaydedilmiyor".

Hiçbiri açılır pencere değil; akışı kesmez, kapatılabilir, kapatılınca o
oturumda tekrar çıkmaz. Karar mantığı `uyelik-daveti.ts` içinde saf ve
test edilebilir.

### Hata 1: "Giriş yap ve kaydet" sözü boşa çıkıyordu

Misafirin oynadığı Günün Turu yalnızca React state'inde tutuluyordu. Ama
girişin iki gerçek yolu da sayfayı baştan yüklüyor: e-postadaki sihirli
bağlantı ve Google ile giriş. Sayfa yeniden yüklenince tur siliniyor,
oyuncu giriş yapıyor ve turu yine lige işlemiyordu.

Ayrıca gönderim yalnızca profili HAZIR olan kullanıcı için yapılıyordu.
Yeni üye olan — yani asıl dönüşüm hedefi — kullanıcı adı ekranına
gidiyor ve turu sessizce kayboluyordu.

Tur artık kalıcı depoda saklanıyor (yine tohum ve adımlar, tur içeriği
değil — kural 3) ve kullanıcı adı seçildikten sonra da gönderiliyor.

### Hata 2: reklamı izleyen oyuncu turunu kaybediyordu

İstemci, ödüllü reklam izleyene dördüncü joker hakkını veriyordu. Ama
sunucu doğrulaması üçten fazlasını reddediyordu: "Joker hakkı aşıldı."
Yani reklamı izleyip dört joker kullanan **meşru** oyuncunun turu
sunucuda reddediliyor, puanı hiç işlenmiyordu.

Üst sınır artık tek kaynakta ve moda bağlı: Antrenman'da 3 + 1 ödüllü
hak, Günün Turu'nda 3 (orada joker reklamı zaten yok — lig adaleti).

> **Edge Function dağıtıldı — sürüm 11.** Canlıdaki kodun yeni joker
> sınırını içerdiği doğrulandı. Dağıtım komutu `--import-map` bayrağı
> olmadan başarısız oluyor; CLAUDE.md'deki komut buna göre düzeltildi.

### Joker satırı okunurluğu

"Süre ekle, Süre ekle, Süre ekle, Süre ekle" yerine "Süre ekle ×4".

## 2026-09-05 - Play Store paketi: reklam kimliği geri kondu, imzalı AAB üretildi

### Çelişki: reklam kimliği izni kaldırılmıştı

Manifest, reklam kimliği (AAID) iznini `tools:node="remove"` ile açıkça
kaldırıyordu. Gerekçesi eski kuraldı: uygulama çocuğa yönelik sayılıyor ve
hiç kişiselleştirme yapılmıyordu.

Ağustos 2026'da kural değişti (kural 6): 18 yaş üstüne UMP ile onay sorulur
ve onay verirse kişiselleştirilmiş reklam gösterilir. Ama izin kaldırılmış
olduğu için bu çalışmıyordu — AdMob reklam kimliğini okuyamadığından onay
veren kullanıcıya da kişiselleştirilmemiş reklam gidiyordu. Onay ekranı
olmayan bir seçim sunuyordu ve yasal metindeki vaat karşılıksızdı. Üstelik
F maddesi "Data safety formu reklam kimliği toplandığını söylemeli" diyordu;
izin yokken bu beyan yanlış olurdu.

Proje sahibinin kararıyla izinler geri kondu (`AD_ID` ve Privacy Sandbox
karşılıkları). Kişiselleştirmenin asıl kapısı izin değil, `reklam.ts`
içindeki `npa` bayrağı: **18 altına hâlâ her zaman `npa: true` gidiyor**,
yani kural 6'nın yaş yasağı olduğu gibi duruyor.

Yasal metinler bu gerçeğe göre düzeltildi: "reklam kimliği toplanmaz" diyen
ifadeler çıkarıldı, yerine reklam kimliğinin Google'a iletildiği ama 18 altı
için yalnızca sayım ve sahtecilik denetiminde kullanıldığı, kişiselleştirme
için kullanılmadığı yazıldı. Veri tablosuna ve üçüncü taraf tablosuna da
eklendi. **Bu metinler avukat onayından geçmelidir** — dosya başında uyarı var.

### Paket üretimi

- `paket-uret.sh` eklendi. Web derlemesi, Capacitor senkronu ve imzalı paket
  üretimini tek komutta yapıyor. Gradle Java 17+ istiyor ama bu makinede
  sistem varsayılanı Java 8 ve `./gradlew` doğrudan hata veriyordu; betik
  uygun JDK'yı kendisi buluyor (önce `JAVA_HOME`, sonra Android Studio'nun
  kendi JDK'sı).
- Sürüm 1.3.0 (versionCode 7) → **1.4.0 (versionCode 8)**.
- İmzalı AAB ve APK üretildi, R8 küçültme ve kaynak temizleme açık.
- Data safety notları gerçek duruma göre güncellendi: reklam kimliği artık
  "toplanıyor ve Google ile paylaşılıyor" olarak beyan edilecek.

### R8 sonrası doğrulama

Paketin içi denetlendi: MainActivity, Capacitor köprüsü, SystemBars (güvenli
alan enjeksiyonunu yapan sınıf), AdMob, UMP onay SDK'sı, Crashlytics,
Analytics ve yerel bildirim eklentisi küçültmeden sağ çıktı. UMP sınıfları
yeniden adlandırılmış ama duruyor — adla çağrılmadıkları için sorun değil.
Web varlıkları ve imza yerinde, sürüm bilgisi doğru.

> **Eksik kalan:** Paketin gerçekten AÇILDIĞI cihazda doğrulanmadı — bu
> makinede bağlı telefon ve kurulu emülatör yok. İmzalı APK proje sahibine
> gönderildi; Play'e yüklemeden önce telefonda bir kez açılmalı.

## 2026-09-05 - Antrenman sonuç ekranı sadeleşti, üstteki beyaz şerit gitti

### Sonuç ekranı

Aynı tur puanı üç ayrı yerde tekrar ediyordu: başlıkta, oturum kartında
ve "bu tur" satırında. İlk turda oturum toplamı zaten tur puanına eşit
olduğu için büyük kart boş yere yer kaplıyordu. Ekran yukarıdan aşağı
yeniden dizildi:

- Sonuç artık insan diliyle söyleniyor. "3 fark" yerine seviyenin kendi
  toleransına göre "Tam isabet", "Çok yaklaştın", "Yaklaştın" veya
  "Bu sefer olmadı"; farkın kendisi altta küçük gri yazıda
  ("hedefe 3 kaldı"). Motivasyon cümlesi sonucun hemen altına alındı.
- Puan tek yerde, büyük: "+8 puan". Başka hiçbir yerde tekrar etmiyor.
- Çarpan artık sayı olarak gösterilmiyor. "Isınma · 90sn · ×0.5" yerine
  tek cümle: çarpan 1'in altındaysa davet ("Normal seviyede aynı sonuç
  15 puan ederdi"), üstündeyse övgü ("Kısa süre seçtin, puanın 2.5
  katına çıktı"). Alternatif puan tahmin edilmiyor, aynı girdilerle
  oyun paketine yeniden hesaplatılıyor — çarpan tablosunun kopyası
  arayüze taşınmadı (kural 1).
- Oturum toplamı kart değil tek satır ve **2. turdan itibaren**
  görünüyor. Üyelik daveti de yalnızca o satırla birlikte çıkıyor.
- "Reklam izle, tekrar oyna" sarı çerçevesinden çıkarıldı, soluk
  ikincil düğmeye indi. Baskın düğme yalnızca "Yeni tur".

### Üstteki beyaz şerit

Android 15'ten itibaren (targetSdk 35+) uygulama pencereyi baştan sona
kaplıyor; `StatusBar.setOverlaysWebView(false)` artık yok sayılıyor.
Durum çubuğunun arkasında kalan yüzey uygulamanın kendi penceresi ve
Capacitor o yüzeyin rengini **temadan** okuyor. Tema açık (Light)
olduğu için okunan renk beyazdı — telefonda görülen şerit buydu.
E komutunda yalnızca CSS tarafı düzeltilmişti, kaynak burasıydı.

Üç yerde birden çözüldü: Android teması koyuya alınıp pencere arka
planı `#0A0E1A`'ya sabitlendi, `html`/`body` zemini boyandı, durum
çubuğu modülü de artık yeni Android'de çalışmayan çağrılara
güvenmiyor (yalnızca simge rengini ayarlıyor, eskiler için overlay
ayarı yedekte duruyor).

> Android tarafı değiştiği için bu değişikliğin telefonda görülmesi
> yeni bir paket derlemesi gerektirir; web dağıtımı tek başına yetmez.

## 2026-08-31 - Yayin oncesi guvenlik ve QA denetimi

Canliya cikmadan once sistem bastan sona denetlendi. Alti bulgu cikti,
hepsi duzeltildi.

> Veritabani gocu **uygulandi** (`005_guvenlik_sertlestirme.sql`),
> Edge Function **surum 10** dagitildi.

### 1. Oyuncu kendi XP'sini ve serisini yazabiliyordu - YUKSEK

`oyuncu` tablosundaki `xp`, `seri_gun`, `seri_son`, `seri_koruma_ay`
sunucu tarafindan (lig tetikleyicisiyle) yaziliyor. Ama RLS
kullanicinin **kendi satirini guncellemesine** izin veriyordu.

Bir oyuncu REST'e tek istek atip `xp = 999999` yazabilir, herkese acik
profilinde sahte seviye ve unvan gosterebilirdi. Kural 2 ihlali.

RLS satir bazlidir, sutun ayrimi yapmaz - bunun icin sutun duzeyinde
GRANT gerekiyor. Uygulama bu tabloya zaten yalnizca kayit sirasinda
INSERT yapiyordu, hic UPDATE yapmiyordu; yani izin tumuyle
kullanilmiyor ama aciti.

Artik INSERT yalnizca `(id, kullanici_adi, gorunen_ad)`, UPDATE
yalnizca `(gorunen_ad)`. `kullanici_adi` bilerek disarida - tasarim
geregi bir kerelik seciliyor.

### 2. Gecmis tarihli gonderimle lig gecmisi doldurulabiliyordu - YUKSEK

Edge Function `tarih` alanini istemciden aliyor ve tohumun o tarihe ait
oldugunu doguluyordu - ama **tarihin bugun oldugunu hic kontrol
etmiyordu.**

Yani bir oyuncu 30 gun geriye "mukemmel" turlar gonderip aylik ligi
tepeden alabilir, seri gecmisi uydurabilirdi.

Artik tarih sunucunun gunune gore +/-1 gun penceresinde olmali. Pay
gerekli: oyuncunun tarihi yerel saatine gore, sunucu UTC calisiyor;
Turkiye'de gece 01:00'de yerel tarih bir gun ileride oluyor.

### 3. Sure ve joker alanlari denetlenmiyordu - ORTA

Antrenman carpani secilen sureye bakiyor (15 sn -> x4). Istemci uydurma
bir sure gonderip carpani sisirebilirdi. Kalan sure de toplam sureyi
asabiliyordu (hiz primi siser).

Artik sure yalnizca sunulan degerlerden biri olabilir, kalan sure
toplami asamaz (sure jokeri payiyla), joker sayisi hakki asamaz,
bilinmeyen joker turu reddedilir, adim sayisi seviyede mumkun olani
asamaz.

Denetim `oyun-sayi/gonderim.ts` icinde ve test ediliyor - Edge
Function'da satir arasina yaziliydi, test edilemiyordu.

### 4. Analytics varsayilan ACIK'ti - kural 7 ihlali

CLAUDE.md kural 7: "Firebase Analytics varsayilan kapali." Kod
varsayilani acik yapiyordu; kullanici hicbir sey secmeden davranisi
olculuyordu.

Varsayilan kapatildi. Crashlytics acik kaldi - cokme raporu kisisel
davranis olcumu degil, uygulamanin ayakta kalmasi icin teshis. Play
Store Data safety notu da buna gore guncellendi.

### 5. Kullanici adi denetimi yalnizca tarayicidaydi - ORTA

Uzunluk, karakter ve kufur denetimi istemcide. REST'e dogrudan yazan
biri bosluklu, kontrol karakterli veya cok uzun ad koyabilirdi - bu
adlar lig tablosunda ve herkese acik profillerde gorunuyor.

Veritabanina bicim kisiti eklendi (3-16 karakter, bosluk ve kontrol
karakteri yasak). Kufur listesi hala istemcide; asil koruma artik
kullanici adinin degistirilememesi.

### 6. Lig tetikleyicisi disaridan cagrilabiliyordu - ORTA

`lig_guncelle` SECURITY DEFINER'di, `search_path` ayarli degildi ve
`/rest/v1/rpc/lig_guncelle` uzerinden anon ve authenticated rollerince
cagrilabiliyordu. Ikisi de klasik yetki yukseltme yolu.

`search_path` sabitlendi, EXECUTE izni geri alindi. Tetikleyici
calisirken EXECUTE izni aranmadigi icin tetikleme etkilenmiyor -
canlida geri alinan bir islemle dogrulandi: lig satiri 137, XP 0->10.

### Temiz cikanlar

| Alan | Sonuc |
|---|---|
| `tur_sonuc` yazma izni | Hicbir kullanicida yok, yalnizca Edge Function |
| Edge Function kimlik dogrulamasi | Kimlik govdeden degil, dogrulanmis oturumdan |
| Hesap silme | Yalnizca kendi hesabini siler, kimlik JWT'den |
| Depoya sizmis sir | Yok - gecmis tarandi, bulunanlar `.env.example` yer tutuculari |
| Android izinleri | Asgari (INTERNET, bildirim, reklam kimligi) |
| 18 alti reklam kisisellestirmesi | Banner ve odullu videoda ayri ayri dogru |
| Yasal metinler | Web/Android ayrimi dogru anlatilmis |
| Parola guvenligi uyarisi | Gecersiz - parola girisi yok, sihirli baglanti ve Google |

### Tekrari onleyen duzenleme

Uc karar Capacitor'a bagli dosyalarin icinde yasiyordu ve test
edilemiyordu. Projede bunun cozulmus kalibi vardi (`bildirim-karar.ts`);
aynisi uygulandi:

- `gonderim.ts` - sunucu girdi denetimi
- `gizlilik-tercih.ts` - gizlilik varsayilanlari
- `reklam-karar.ts` - reklam kisisellestirme karari (banner ve odullu
  video artik ayni kaynagi okuyor; ikisi ayrisamaz)

### Testler

- `gonderim-guvenlik.test.ts` - 17 test: gecmis/gelecek tarih, carpan
  sisirme, joker istismari, bozuk tip ve enjeksiyon denemeleri
- `gizlilik-reklam.test.ts` - 5 test: analitik varsayilani, 18 alti ve
  onaysiz kullanicida kisisellestirmesiz reklam

Toplam **211 test**, 5 e2e, tip denetimi ve derleme yesil.

---

## 2026-08-30 — Joker bedeli gerçekten düşüyor

> ⚠️ **Edge Function yeniden dağıtılmalı.** Puan hesabı değişti. Tur
> üretimi değişmedi; mevcut turlar aynı.

### Belirti

Üç jokerin üçü de kullanıldı, tam isabet yapıldı ve puan neredeyse hiç
düşmedi.

### Sebep

Joker bedelleri (3/2/2) **0–15'lik temel puan ölçeğine** göre
belirlenmişti — üçünün toplamı temel puanın yaklaşık yarısı. Ama bedel
**çarpandan sonra** uygulanıyordu.

Faz 3C'de Günün Turu puanı ×10 ile büyütüldü; bedeller büyütülmedi ve
sıra da gözden geçirilmedi. Sonuç:

| | Jokersiz | 3 joker | Düşen |
|---|---|---|---|
| Günün Turu (eski) | 140 | 133 | **7 (%5)** |
| Antrenman 60sn (eski) | 21 | 14 | 7 (%33) |

Yani Günün Turu'nda joker pratikte **bedavaydı** — ve aynı hak, moda
göre bambaşka fiyattaydı.

### Düzeltme

Bedel artık **çarpandan önce** düşülüyor. Oran her modda aynı kalıyor:

| Senaryo | Jokersiz | 1 joker | 3 joker | Düşüş |
|---|---|---|---|---|
| Günün Turu · normal | 140 | 110 | 70 | %50 |
| Günün Turu · usta | 130 | 100 | 60 | %54 |
| Antrenman · normal 60sn | 21 | 17 | 11 | %48 |
| Antrenman · normal 15sn | 52 | 40 | 24 | %54 |
| Antrenman · usta 30sn | 65 | 50 | 30 | %54 |

### Hesap tek yere alındı

Çarpan ve joker sırası **iki ayrı yerde** yazılıydı: arayüzde ve Edge
Function'da. Aynı sıra iki kez elle yazıldığı için biri düzeltilip
diğerinin unutulması kaçınılmazdı — kural 1 ihlali.

Yeni `nihaiPuanHesap` fonksiyonu `paketler/oyun-sayi` içinde; hem arayüz
hem sunucu onu çağırıyor. Artık ayrışamazlar.

### Yardım metni düzeltildi

"−3 puan" yazıyordu ama Günün Turu'nda bu 30 puana denk geliyor.
Kullanıcı "3 puan mı kaybettim?" diye düşünüyordu. Artık her iki ölçek
de gösteriliyor ve üç jokerin puanın yaklaşık yarısını götürdüğü
yazıyor.

### Geçmiş veri

Canlıda yalnızca 3 turda joker kullanılmış (2 Günün Turu, 1 Antrenman) —
hepsi geliştirme testleri. Veri düzeltmesi gerekmedi.

### Test

`joker-bedeli.test.ts` — 17 test. Beş farklı mod/seviye/süre birleşiminde
üç jokerin puanın en az üçte birini götürdüğü, tek jokerin bile görünür
fark yarattığı ve **oranın modlar arasında tutarlı** olduğu doğrulanıyor.
Ayrıca bedellerin ölçeğe uygun kaldığını denetleyen bir test var: puan
ölçeği ileride yine değişirse bedellerin de gözden geçirilmesi gerektiğini
hatırlatır.

189 test, 5 e2e, tip denetimi ve derleme yeşil.

---

## 2026-08-30 — Hedef artık asla tahtada olmuyor

> ⚠️ **Bu sürüm üretilen tüm turları değiştirir.** Edge Function
> (`tur-gonder`) yeniden dağıtılmadan yayınlanırsa istemci ile sunucu
> farklı tur üretir ve gönderilen her tur reddedilir. Sıra: önce
> fonksiyon, sonra push.

### Kusur

Isınma'da binde ~6 turda hedef sayı raftaki taşlardan biri oluyordu —
örnek: hedef `10`, taşlar `2, 9, 10, 5`. Bulmaca daha başlamadan
çözülmüş oluyordu: "En yakın" göstergesi 0 diyor, oyuncu hiçbir işlem
yapmadan tam isabet alıyor ve tur anında kapanıyordu.

Isınma yeni oyuncunun gördüğü **ilk** seviye. Bedavaya kazanılan bir
bulmaca, oyunun ne olduğunu daha anlamadan yanlış bir izlenim bırakıyor.

Kusur, önceki düzeltmenin regresyon testi yazılırken ortaya çıktı:
çözüm zinciri boş dönüyordu, sebebi araştırılınca bu bulundu.

### Düzeltme

Üretim artık hedefi taşlardan birine eşit olan turu reddedip yeniden
üretiyor. Kontrol üretimin **iki kolunda da** var (geriye arama ve ileri
üretim) ve deterministik — aynı tohum yine aynı turu veriyor.

Geriye aramada kontrol çözücüden **önce** yapılıyor: böyle bir turu
çözmeye çalışmak boşa iş.

### Etkisi ölçüldü

5.000 tur üretildi (dört seviye, değişen büyük sayı adedi):

| | Sonuç |
|---|---|
| Hedefi tahtada olan tur | **0** |
| Sıfır adımlı çözüm | **0** |
| Çözümsüz tur | **0** |
| Üretim hızı | değişmedi |

Zorluk sırası korunuyor — dört ölçüt de Isınma → Usta boyunca tek
yönlü. Isınma'nın çözüm yoğunluğu 4.4'ten 4.1'e indi: bedava turlar
elendiği için seviye hafifçe zorlaştı, beklenen ve istenen yön.

### Test

`cozum-tura-ait.test.ts` içindeki "bilinen kusur" kaydı, kuralı koruyan
bir teste dönüştürüldü: her seviyede 500 tur, hiçbirinde hedef tahtada
olamaz ve çözüm en az bir adım içermeli.

172 test, 5 e2e, tip denetimi ve derleme yeşil.

---

## 2026-08-30 — ACİL DÜZELTME: çözüm ve joker yanlış turu gösteriyordu

> ⚠️ **Edge Function yeniden dağıtılmalı.** Sunucudaki Günün Turu
> doğrulaması değişti (aşağıya bakın). Oyun üretimi değişmedi, yani
> mevcut turlar aynı kalıyor.

### Belirti

Antrenman · Normal, tahtada `2, 4, 10, 4, 5`, hedef `105`. "Bir adım aç"
jokeri `6×4=24`, `24×7=168`, `50÷25=2` gösteriyordu. Bu sayılar tahtada
yoktu. Sonuç ekranındaki çözüm de aynı turdan değildi.

### Sebep — bildirilen iki hipotezin de değil

Tur `uretimYap(seviye, tohum, buyukAdet)` ile üretiliyor. Seviye ve
tohum turda saklanıyordu ama **`buyukAdet` saklanmıyordu.**

Çözüm ve joker turu tohumdan yeniden ürettiğinde bu ayarı bilmiyor,
seviyenin varsayılanını (Normal için 2 büyük sayı) kullanıyordu. Oyuncu
büyük sayıyı 0 seçtiği için yeniden üretim **başka bir tur** çıkarıyordu
— 50 ve 25 oradan geliyordu.

Yani `turUret` de `cozumBul` de tek başına doğruydu; eksik olan, turun
kendi üretim ayarını taşımamasıydı.

**D komutuyla ilgisi yok.** Hata, oyuncu Antrenman'da büyük sayı ayarını
varsayılandan (2) saptırdığı her durumda vardı. D'den önce de vardı.

### Düzeltme — iki katman

1. **Kök neden:** `buyukAdet` artık turun içinde saklanıyor
   (`SayiVeri.buyukAdet`) ve her yeniden üretimde kullanılıyor.
2. **Güvenlik ağı:** yeni `turdanUretim` fonksiyonu, yeniden ürettiği
   turu ekrandaki turla karşılaştırıyor. Taşlar veya hedef tutmuyorsa
   yeniden üretime **hiç güvenmiyor**, ekrandaki gerçek tahtayı çözüyor.
   Böylece ileride başka bir üretim parametresi eklense bile oyuncuya
   yanlış çözüm gösterilemez.

`turUret` platform arayüzünde 2 parametreli kaldı — `buyukAdet` oyuna
özgü bir kavram, platformun bilmesi gerekmiyor (kural 1). Özel ayarlı
tur için oyuna ait `turKur` fonksiyonu eklendi.

### Sunucu tarafı

**Lig ve Günün Turu etkilenmemiş.** Edge Function `buyuk_adet`i
istemciden açıkça alıyor ve onunla üretiyor; istemciyle ayrışma yoktu.
Canlı veritabanında doğrulandı: 12 Günün Turu kaydının hepsinde
`tur_sonuc` ile `lig_gunluk` tutarlı, tetikleyici doğru çalışıyor.

Ama incelerken **ayrı bir açık** bulundu ve kapatıldı: Günün Turu'nda
`buyuk_adet` istemciden geldiği gibi kullanılıyordu. Oyuncu kendine
daha kolay bir yapılandırma seçip aynı tohumla başka bir tur üretebilir
ve onu oynayıp lige puan yazdırabilirdi. Sunucu artık Günün Turu'nda
kendi varsayılanını dayatıyor (kural 2).

### Test boşluğu kapatıldı

Bu hatanın fark edilmeden canlıya çıkmasının sebebi, çözümün tura ait
olduğunu doğrulayan bir testin hiç olmamasıydı.

`cozum-tura-ait.test.ts` — her seviyede 500 tur:

- Yeniden üretilen tur, turun kendisiyle aynı mı
- Çözümdeki her adım tahtadaki taşlarla oynanabiliyor mu
- Çözümün son satırı hedefe eşit mi
- Joker, o turun çözümünün ilk adımını mı gösteriyor

**Kritik ayrıntı:** testler `buyukAdet`i turdan tura değiştirerek
çalışıyor. Yalnızca varsayılanla çalışan bir test bu hatayı
yakalayamazdı — hata tam da varsayılandan sapıldığında ortaya çıkıyor.

Ayrıca güvenlik ağının çalıştığı, bozuk/eksik ayarlı turlarda bile
çözümün ekrandaki tahtaya ait olduğu test ediliyor.

### Yol boyunca bulunan ayrı kusur (bu PR'da düzeltilmedi)

Isınma'da binde ~6 turda **hedef zaten tahtada** çıkıyor (örnek:
hedef 10, taşlar 2-9-10-5). Bulmaca başlamadan çözülmüş oluyor.

Düzeltmesi üretimi değiştirir, yani üretilen bütün turlar değişir ve
Edge Function'ın yeniden dağıtılmasını gerektirir. Acil düzeltmeyi
bekletmemek için ayrıldı. Test bu kusuru kayıt altına alıyor: oran
artarsa kırmızı verir.

### Testler

169 test, 5 e2e, tip denetimi ve derleme yeşil.

---

## 2026-08-24 — Kurulum ekranı: anlaşılır başlıklar, belirgin seçim

### "MOD" kimseye bir şey anlatmıyordu

Başlık `MOD` yazıyordu. Oyun terimi bilmeyen için bu bir şey ifade
etmiyor ve orada bir seçim yapılması gerektiğini de söylemiyor.

| Önce | Sonra |
|---|---|
| MOD | **Nasıl oynamak istersin?** |
| SEVİYE | **Zorluk** |

Soru cümlesi hem anlaşılır hem de seçim beklendiğini kendisi söylüyor.
"Serbest, sınırsız" da "İstediğin kadar" oldu.

### Seçili olan, seçili olmayandan ayırt edilemiyordu

İkisi de sönük ve ince çerçeveliydi; hangisinin açık olduğu tek bakışta
anlaşılmıyordu.

**Oyun türü düğmeleri:** 56px'ten 76px'e çıktı, simge kazandı. Seçili
olan dolgulu, çerçevesi tam renkli, hafif ışıklı ve sağ üstünde onay
işareti taşıyor. Seçili olmayan artık "devre dışı" değil
"basılabilir" duruyor.

**Zorluk düğmeleri:** 44px'ten 48px'e çıktı. Seçili olan **dolu
renkte** — arka planı camgöbeği, yazısı koyu. Bu, ekrandaki en yüksek
karşıtlık; hangisinin seçili olduğu tartışmasız.

Ana eylem düğmesinin baskınlığı korundu: "Başla" düğmesi seçili zorluk
düğmesinden **2.5 kat** büyük ve yazısı daha iri. Seçim düğmeleri
dikkat çekiyor ama asıl eylemi gölgelemiyor.

Basılınca hafif küçülme geri bildirimi eklendi; hareket azaltma açıksa
uygulanmıyor.

### Zorluk düğmelerindeki görüntü kirliliği

Etiket ile ayrıntı aynı satırdaydı ("Isınma 2 hane · 4 taş"). Bu yüzden
düğmeler farklı genişliklerde çıkıyor, satır sonları düzensiz sarıyor ve
blok dağınık görünüyordu.

Artık iki sütunlu ızgara: her düğme aynı boyda (155×67), **ad üstte,
ayrıntı altta**. Yukarıdaki oyun türü düğmeleriyle aynı düzen — göz iki
bloğu tek bir sistem olarak okuyor. Seçili olana onay işareti de geldi.

---

## 2026-08-24 — Menü büyütüldü, yasal bağlantılardaki kopya kaldırıldı

### Yasal bağlantılar iki yerde yaşıyordu

KVKK, Gizlilik, Çerez, Koşullar ve "Hesabı sil" giriş yapan kullanıcı
için profil sayfasına taşınmıştı — ama **Kurulum ve Sonuç ekranlarının
alt bilgisinden silinmemişti.** Aynı bağlantılar iki ayrı yerde
duruyordu; biri güncellenip diğeri unutulabilirdi.

Alt bilgiler kaldırıldı. Ama tamamen kaldırmak tek başına yanlış olurdu:

> **Misafirin profili yok.** Profil sayfası `/o/kullanici-adi`
> adresinde, yani bir kullanıcı adı ister. Bağlantılar yalnızca profile
> bırakılsaydı giriş yapmamış kullanıcı KVKK metnine **hiçbir yerden**
> ulaşamazdı. Bu hem KVKK açısından hem Play Store şartları açısından
> kabul edilemez.

Bu yüzden erişim **menüye** taşındı: menü her ekranda ve misafirde de
var. Yeni `/yasal` sayfası hepsini tek listede topluyor — gizlilik
ayarları, dört yasal metin ve (yalnızca üyeye) hesap silme.

Giriş yapan kullanıcı için profildeki bölüm olduğu gibi duruyor.

### Menü öğeleri çok küçüktü

Öğeler **36px** yüksekliğindeydi (Instagram satırı 32px) — kural 10'un
en az 44px şartının altında ve mobilde ıskalanıyordu.

| | Önce | Sonra |
|---|---|---|
| Menü öğesi yüksekliği | 36px | **48px** |
| Hamburger düğmesi | 44px | **48px** |
| Panel genişliği (360px ekranda) | 224px | **272px** (%76) |
| Yazı boyutu | 14px | 15px |

Panel genişliği ekranla birlikte büyüyor ama sınırlı: dar telefonda
okunaklı, geniş ekranda ekranı kaplamıyor.

### Test

`yasal-erisim.spec.ts` — misafirin menüden yasal metinlere ulaştığını,
"Hesabı sil"in misafire gösterilmediğini ve alt bilgilerin geri
gelmediğini doğruluyor. Biri menüdeki "Gizlilik ve yasal" öğesini
kaldırırsa bu test kırmızı verir.

Toplam 160 birim testi ve **5 e2e** geçiyor.

---

## 2026-08-24 — Tema 2: puan sayması ve ses dokusu

Temanın ikinci turu. Birinci tur yazı, derinlik ve birleşme
animasyonuydu; bu tur ödül anı ve ses.

### Puan artık sayılıyor

Tam isabet yapınca puan bir anda ekrana yazılıyordu. Oyunlarda tatmini
yaratan şey sonucun kendisi değil, sonuca **varış**. Puan artık sıfırdan
yükselerek yerine oturuyor.

- Eğri hızlı başlayıp sona doğru yavaşlıyor; doğrusal sayma makine gibi
  hissettiriyordu.
- Süre puanla birlikte uzuyor (150 puan ile 8 puan aynı sürede
  sayılırsa büyük sayı gözle takip edilemez) ama **üst sınırı var** —
  oyuncuyu bekletmek ödülü ödül olmaktan çıkarır.
- Sayma yalnızca görsel bir süs: gerçek değer her zaman `data-deger` ve
  `aria-label` içinde son hâliyle duruyor. Ekran okuyucu sayının
  zıplamasını okumuyor, testler de ara değeri yakalayıp yanlış sonuç
  vermiyor.
- "Hareketi azalt" açıksa sayma hiç yapılmıyor.

Oturum özeti bilerek **animasyonsuz** bırakıldı: antrenman e2e testi o
metindeki sayıyı okuyor, animasyon eklenirse test kırılgan hâle gelirdi.

### Sesler artık sinyal değil, enstrüman

Ses altyapısı zaten sağlamdı — dosya indirmiyor, çevrimdışı çalışıyor,
mobildeki ses kilidi doğru çözülmüş. Eksik olan tonların **dokusuydu**:
tek osilatörlü saf sinüs, yani "bip".

Üçü de dosya gerektirmeden eklendi:

| Ekleme | Ne yapıyor |
|---|---|
| Çift osilatör, hafif akort kayması (9 sent) | Ton kalınlaşır; tek osilatörün ince, elektronik tınısı gider |
| Alçak geçiren süzgeç | Tiz kenarları yumuşatır, ses kulağı tırmalamaz. Kesim frekansı tonla yükselir ki pes sesler boğuk, tiz sesler cılız kalmasın |
| Kısa yankı | Sesin bittiği yerde küçük bir kuyruk bırakır; kuyruksuz ses kapalı kutuda çalıyormuş gibi durur |

Yankı odası da kodla üretiliyor (gürültü patlaması + üstel sönüm), dosya
yok. Odanın üretiminde `Math.random` kullanılıyor ve bu güvenli: ses
dokusu oyun kuralı değil, deterministik olması gerekmiyor.

Tarayıcı bu üçünden birini desteklemezse ses yine çalıyor, yalnızca o
katman atlanıyor. Ayrıca ton bittiğinde düğümler bırakılıyor — uzun
oturumda birikmesinler.

### Testler

`sayim.test.ts` — 13 test. En kritik olanı: sayma bittiğinde **gerçek
puan** görünmeli; yuvarlama yüzünden 149'da kalan bir sayaç oyuncuya
yanlış puan göstermiş olur. Toplam **160 test** geçiyor.

---

## 2026-08-24 — Tema: yazı kimliği, derinlik ve birleşme animasyonu

Oyun "amatör" duruyordu. Sebep zevk değil, üç somut eksikti.

### 1. Yazı tipi yoktu

Her şey `system-ui` ile yazılıyordu — yani oyun, telefonun **Ayarlar
ekranıyla aynı yazıyı** kullanıyordu. Bu tek başına "uygulama" hissi
verip "oyun" hissini öldürüyordu. El yazısı yedeğinde ayrıca
**Comic Sans** vardı.

Artık iki yazı, iki iş:

| Değişken | Nerede | Neden |
|---|---|---|
| `--zt-yazi-oyun` (Space Grotesk) | taşlar, hedef, süre, başlıklar, düğmeler | rakam çizimi güçlü, geometrik, teknik |
| `--zt-yazi-metin` (sistem) | yasal sayfalar, uzun açıklamalar | uzun metinde okunurluk önce gelir |
| `--zt-yazi-el` (Caveat) | çözüm tahtası | Comic Sans yedeği kaldırıldı |

Yazı tipleri uygulamanın **içine gömülü** — PWA çevrimdışı çalışmalı ve
Capacitor paketinde dış kaynak isteği engelleniyor. Türkçe harfler
(ı, ğ, ş, İ) `latin-ext` alt kümesinde; tarayıcı yalnızca gerekeni
indiriyor. Rakamlar `tabular-nums` ile sabit genişlikte — sayı
değişirken zıplamıyor.

Uygulama tek yerden: `h1..h3`, `button`, taşlar ve gösterge alanları CSS
seçicisiyle yakalanıyor. Ekran ekran sınıf eklenmedi; yeni bir ekran
açıldığında kimliği hatırlamak gerekmiyor.

### 2. Taşlar düz dikdörtgendi

Gölge, ışık, katman yoktu — kâğıt gibi duruyorlardı. Oysa markanın kendi
hikâyesi "iki taş birleşir"; taşın tutulabilir bir nesne gibi
hissettirmesi gerekiyor.

Üç katman eklendi: üstten gelen ışık, gövde eğimi ve zemin gölgesi.
Seçili taş artık ışık kaynağı gibi davranıyor. Hepsi boya işi — düzeni
hiç etkilemiyor.

### 3. Oyunun çekirdek anı animasyonsuzdu

**En önemli eksik buydu.** Bütün oyun tek bir jestin üstüne kurulu: iki
taş birleşir, yeni bir taş olur. O an hiç canlandırılmıyordu — iki taş
kayboluyor, yerine üçüncüsü beliriyordu.

Artık birleşen taşların görüntü kopyaları yeni taşa doğru süzülüp
sönüyor, yeni taş hafif bir sıçramayla doğuyor.

- Animasyon oyunun durumuna **hiç dokunmuyor**; yarıda kesilse de oyun
  doğru çalışır.
- Yalnızca `transform` ve `opacity` kullanılıyor — telefonun ekran
  işlemcisinde çalışır, alt segment cihazda da akar.
- Cihazda "hareketi azalt" açıksa hiç oynatılmaz.
- Karar mantığı (`birlesmeMi`) saf bir fonksiyonda; DOM'a dokunmadan
  test ediliyor.

**Yol boyunca bulunan kırılganlık:** temizlik yalnızca animasyonun
bitmesine bağlıydı. Kullanıcı birleşme anında uygulamadan çıkarsa
tarayıcı animasyonu ilerletmez, bitiş olayı hiç gelmez ve kopya ekranda
takılı kalırdı — geri dönen kullanıcı dokunulamayan hayalet bir taş
görürdü. Artık zaman aşımı da var; hangisi önce gelirse siliyor.

### Boyut

Türkçe bir kullanıcı için Space Grotesk ~49 KB. Caveat (~69 KB)
yalnızca sonuç ekranına varıldığında yükleniyor. Servis çalışanı
kullanıldıkça önbelleğe aldığı için Kiril alfabesi dosyaları hiç
indirilmiyor.

### Testler

`tas-animasyon.test.ts` — geri alma, sıfırlama ve tur başlangıcının
birleşme sayılmadığı; kayma hesabının merkezden merkeze doğru
çalıştığı; animasyon sürelerinin oyunu bekletecek kadar uzun
olmadığı. Toplam **147 test** geçiyor.

### Sırada

Puan sayma animasyonu, sonuç ekranı açılışı ve seslerin
zenginleştirilmesi (şu an tek osilatörlü saf tonlar — "bip" karakterinde).

---

## 2026-08-24 — Güvenli alan ve arayüz rötuşları (E)

### Alt banner gezinme çubuğunun üstüne alındı

Banner'ı native katman yerleştiriyor ve varsayılan olarak ekranın en
altına koyuyordu — telefonun gezinme çubuğunun **altına**. İki sonucu
vardı: reklamın bir kısmı görünmez oluyordu (gösterildi sayılıp
görülmüyordu) ve kullanıcı gezinme çubuğuna basarken reklama değiyordu.
AdMob ikincisini **geçersiz tıklama** sayar; tekrarlanırsa hesap askıya
alınır.

`env(safe-area-inset-bottom)` değeri JavaScript'ten doğrudan okunamadığı
için o yükseklikte görünmez bir öğe ölçülüp hemen kaldırılıyor; çıkan
değer banner'a kenar boşluğu olarak veriliyor. Ölçüm başarısız olursa 0
dönüyor — banner yine gösteriliyor, yalnızca boşluk bırakılmıyor.

### Yardım, olmayan bir arayüzü anlatıyordu

"Düğmeler" bölümü `↶` ve `⟲` gibi ikonlar gösteriyordu. **Oyun ekranında
böyle ikonlar hiç yok** — düğmelerin üstünde düz yazı var ("Geri al",
"Sıfırla", "Bitir"). Yani yardım, var olmayan bir arayüzü tarif ediyordu;
üstelik iki ikon birbirine o kadar benziyordu ki hangisinin hangisi
olduğu da anlaşılmıyordu.

Liste artık düğmelerin gerçek yazılarını taşıyor. Geri al ile Sıfırla'nın
farkı da açıkça yazıldı: biri **yalnızca son işlemi** geri alır, diğeri
**bütün işlemleri** siler.

### Dokunma hedefleri 44px kuralına getirildi

| Öğe | Önce | Sonra |
|---|---|---|
| Yardım'ın kapatma düğmesi | 40px | 44px |
| Yasal bağlantılar (KVKK, Gizlilik, Çerez, Koşullar, Hesabı sil) | 16px | 44px |
| Cümle içindeki "Giriş yap →" | 16px | 44px |

Yazı boyutları değişmedi. Yasal bağlantılarda dikey boşluk, cümle içindeki
bağlantıda ise görünmez bir katman kullanıldı — ikincisinde dikey boşluk
satır dizilişini bozardı.

### Değişmeyen

Üst güvenli alan, kilitli seviye açıklaması, seri rozetlerinin
tutarlılığı ve sonuç ekranında ana eylemin baskınlığı zaten yapılmıştı;
tarayıcıda doğrulanıp olduğu gibi bırakıldı.

### Doğrulama

- 360px ve 375px genişlikte yatay taşma yok
- Çentikli cihaz taklit edildi (üst 47px, alt 34px): menü durum
  çubuğunun altında kalıyor, banner boşluğu 94px'e çıkıyor (60 reklam +
  34 gezinme çubuğu), taşma yok
- `guvenli-alan.test.ts`: ölçümün 0/negatif/geçersiz durumlarda güvenli
  davrandığı ve ölçtüğü öğeyi sayfada bırakmadığı test edildi
- Toplam 135 test geçiyor

> **Not:** Banner ile gezinme çubuğunun gerçekten çakışmadığı ancak
> Android cihazda ya da öykünücüde kesinleşir. Tarayıcıda güvenli alan
> değerleri sıfır olduğu için formül elle değer verilerek doğrulandı.

---

## 2026-08-24 — Zorluk dengesi (D)

> ⚠️ **Bu sürüm üretilen tüm turları değiştirir.** Edge Function
> (`tur-gonder`) yeniden dağıtılmadan yayınlanırsa istemci ile sunucu
> farklı tur üretir ve **gönderilen her tur reddedilir.**

### Düzeltilen kritik hata — üretim makine hızına bağlıydı

Tur üretimindeki çözücü **süreye göre** kesiliyordu (`Date.now`, 300 ms).
Yavaş bir makinede arama zaman aşımına uğrayıp adayı reddediyor, hızlı
makinede kabul ediyordu. Sonuç: **aynı tohum farklı makinede farklı tur
üretiyordu.** İstemci ile Edge Function ayrışırsa sunucu gönderilen her
turu reddeder ve oyun tamamen durur. Üstelik yerelde fark edilmez, çünkü
iki taraf da aynı hızlı makinede çalışır.

Ölçüm sırasında ayrıca görüldü ki yavaş makinede üretilen tur **çözümsüz
bile kalabiliyordu**.

Çözücü artık süre değil **düğüm sayısı** harcıyor (`URETIM_DUGUM_SINIRI`),
yani her makinede birebir aynı sonucu veriyor. Süre sınırlı biçim
duruyor; bot ve arayüz gibi deterministik olması gerekmeyen yerlerde
kullanılıyor.

### Düzeltilen — Zor, Normal'den kolaydı

Çözüm yoğunluğu eşikleri seviye yükseldikçe **sıkılaşacağına gevşiyordu**:
Normal 6, Zor 8, Usta 4. Zor'un eşiği Normal'inkinden yüksek olduğu için
Zor daha çok alternatif çözüm yoluna izin veriyordu.

Eşikler artık seviye tanımının içinde (tek kaynak; iki üretim yolu da
aynı değeri okuyor) ve tek yönlü sıkılaşıyor: Isınma yok, Normal 6,
Zor 2, Usta 1.

| Ölçüt | Isınma | Normal | Zor | Usta |
|---|---|---|---|---|
| Çözüm yoğunluğu — **önce** | 4.4 | 2.6 | **8.6** | 19.1 |
| Çözüm yoğunluğu — **sonra** | 4.4 | 2.6 | **0.9** | 0.1 |
| Tek çözüm oranı — **önce** | %34 | %37 | **%6** | %24 |
| Tek çözüm oranı — **sonra** | %34 | %37 | **%78** | %100 |

### Ölçüm betiği dürüstleştirildi

- Süre sınırlı kendi kopyası yerine **üreticinin kullandığı fonksiyonun
  aynısını** çağırıyor (kural 1: hesap tek yerde). Ölçüm artık
  deterministik.
- Sorunu gösteren iki ölçüt (çözüm yoğunluğu, tek çözüm oranı) "bilgi"
  olarak işaretlenip kontrol dışı bırakılmıştı; betik bu yüzden bozuk
  duruma "yeşil" diyordu. İkisi de kontrole geri alındı.
- Rakamın anlamı netleştirildi: "toplam çözüm" değil, **eşit düğüm
  bütçesiyle bulunan çözüm**. Bütçe her seviyede aynı olduğu için
  karşılaştırma adil.
- Yeni "filtrenin ayırt etme gücü" bölümü, eşiğin fiilen çalışmadığı
  seviyeleri açıkça söylüyor. Zor ve Usta'da zorluğu asıl taş sayısı
  taşıyor; filtre orada az tur reddediyor.

### Testler

- `uretim-determinizm.test.ts`: saati ileri sararak "çok yavaş makine"
  taklit ediliyor; üretim saate bakarsa test kırmızı veriyor.
  Düzeltme geri alınarak testin hatayı gerçekten yakaladığı doğrulandı.
- Eşiklerin seviye yükseldikçe gevşemediğini doğrulayan test
- Toplam 129 test geçiyor

---

## 2026-08-24 — Günlük hatırlatma (C) ve seri koruma sınırı

### Değişen

- **Bildirim karar mantığı native katmandan ayrıldı** (`bildirim-karar.ts`).
  "Bugün mü yarın mı, hangi metinle, yoksa hiç mi" sorusu artık saf bir
  fonksiyon; gerçek cihaz olmadan test edilebiliyor. `bildirim.ts` yalnızca
  bu kararı uyguluyor, kural kopyası tutmuyor.
- **Seri koruma hakkı gerçekten ayda bir oldu.** Yardım ekranı böyle
  anlatıyordu ama kodda hiçbir sınır yoktu — seri her kırıldığında koruma
  tekrar tekrar teklif ediliyordu. Sınır artık depoda, ay anahtarıyla.
- Yardım metni gerçek davranışı anlatacak şekilde düzeltildi.

### Düzeltilen hatalar

- **Bildirime dokununca hiçbir şey olmuyordu.** `zt-bildirim-tiklandi`
  olayı yayınlanıyordu ama dinleyicisi yoktu. Artık dokununca Günün Turu
  açılıyor.
- **Seri koruma notu bildirimde hiç çıkmıyordu.** Koruma durumu her
  yerden `false` geçiliyordu; artık gerçek hak durumu okunuyor.

### Değişmeyen

Yasal metinler zaten doğruydu: bildirimin cihaz üstünde planlandığı ve
sunucuya token gönderilmediği hem KVKK aydınlatma metninde hem çerez
tablosunda yazılı. FCM altyapısına dokunulmadı — Faz 4 düellosunda
gerekecek.

---

## 2026-08-24 — İlk oturum reklamsız

### Değişen

- **İlk 3 tur tamamlanana kadar hiç banner gösterilmiyor.** Kaldırmaların
  çoğu ilk 24 saatte oluyor ve bu kategoride birinci sebep reklam;
  kullanıcıya değer görmeden maliyet gösterilmiyor.
- Sayaç **kalıcı saklanıyor** (`tamisabet.tamamlanan-tur`); uygulama
  kapanıp açılınca sıfırlanmıyor. Eşiğe ulaşınca artmayı bırakıyor.
- Kapı `bannerGoster` içinde, tek yerde. Kurulum, Sonuç, Lig ve Profil
  ekranları kuralı otomatik uyguluyor.
- **Ödüllü video muaf** — kullanıcı onu kendisi istiyor.

### Doğrulanan

- Ödüllü video da 18 yaş altı kullanıcılarda `npa: true` ile çağrılıyor.
  Banner ve ödüllü video AdMob'da ayrı çağrı yolları kullanıyor; ikisi de
  doğru.

### Ayrıca düzeltilen (eskiden kırmızı duran testler)

- `depo.test.ts`: `gunlukKaydet` seri koruma eklendiğinde dönüş biçimini
  değiştirmişti, testler eski biçime bakıyordu
- `determinizm.test.ts`: dosyada `it(...)` yoktu, vitest "test yok" diyordu
- `ilk-kez.spec.ts`: kaldırılan "Kolay" seviyesini arıyordu

---

## 2026-08-19 — Seviye birleştirmesi ve zorluk dengesi

### Değişen

- **"Kolay" seviyesi kaldırıldı, "Normal" ile birleştirildi.** Beş seviye
  dörde indi. Yeni sıra: Isınma → Normal → Zor → Usta.
- **Yeni Normal**, eski Kolay'ın taş sayısını (5) ve eski Normal'in hedef
  aralığını (100–999) devraldı. Yani daha az taşla daha geniş bir aralık —
  eski Kolay'dan zor, eski Normal'den biraz daha zorlayıcı.
- **Hedef aralıkları örtüşmeyecek şekilde ayrıldı.** Her seviyenin alt
  sınırı, bir öncekinin üst sınırının üstünde başlar. Önceden Kolay
  (100–499) ile Normal (101–999) iç içeydi.
- **Süreler yeniden dengelendi.** Zor ve Usta kısaldı; zorluk arttıkça
  görece daha az süre kalması amaçlandı.

| Seviye | Hane | Taş | Hedef aralığı | Süre | Önceki süre |
|---|---|---|---|---|---|
| Isınma (`cocuk`) | 2 | 4 | 10–99 | 60 sn | 60 sn |
| Normal (`normal`) | 3 | 5 | 100–999 | 60 sn | 45 sn |
| Zor (`zor`) | 4 | 6 | 1.000–9.999 | 75 sn | 90 sn |
| Usta (`usta`) | 5 | 7 | 10.000–99.999 | 90 sn | 120 sn |

### Veri göçü

`sunucu/gocler/004_seviye_kolay_normal_birlestirme.sql` — canlı veritabanında
19 Ağustos 2026'da çalıştırıldı ve doğrulandı.

- `tur_sonuc`: `kolay` satırları `normal` olarak yeniden etiketlendi
- `lig_gunluk`: çakışan kayıtlarda **en yüksek** puan korundu
- `lig_donem`: çakışan kayıtlarda puanlar ve gün sayıları **toplandı**
- `lig_antrenman_hafta`: puanlar ve tur sayıları **toplandı**
- `ayar.gunun_turu_sure_sn`: yeni sürelerle güncellendi

`seviye` sütunu üç lig tablosunda birincil anahtarın parçası olduğu için
düz bir `UPDATE` çakışma verirdi; göç önce birleştirip sonra siliyor.

**Yerel depo:** `acikSeviyeler` içinde `kolay` bulunan oyuncular için
`eskiSeviyeleriEsle()` eklendi — Kolay'ı açmış biri Normal'i yeniden
açmak zorunda kalmaz.

### Dağıtım notu

Edge Function (`tur-gonder`) turu tohumdan yeniden üretip doğruluyor.
Sunucu ile istemcinin seviye ayarı farklı olursa üretilen taşlar
uyuşmaz ve **her tur reddedilir**. Bu yüzden fonksiyon, ön uçla
birlikte yeniden dağıtıldı.

### Testler

- Her seviyede 100 ve 200 turluk çözülebilirlik testleri güncellendi
- Seviye aralıklarının örtüşmediğini doğrulayan test eklendi
- Taş sayısının seviye yükseldikçe azalmadığını doğrulayan test eklendi
- `kolay` → `normal` yerel depo göçü için testler eklendi
- Toplam 97 test geçiyor
