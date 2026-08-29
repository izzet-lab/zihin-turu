# Değişiklik günlüğü

Bu dosya, oyun dengesini veya veri yapısını etkileyen değişiklikleri kaydeder.
Küçük hata düzeltmeleri ve görsel rötuşlar buraya yazılmaz.

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
- Sayaç **kalıcı saklanıyor** (`zihinturu.tamamlanan-tur`); uygulama
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
