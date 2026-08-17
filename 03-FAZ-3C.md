# Faz 3C — Sıralama, Lig Mekaniği ve Tutundurma

---

## 1. Sıralamada puan görünmemesi — bu bir hata

"Veritabanı boştu ama bu bir hata değildi" teşhisi eksik. Boş olmasının
sebebi doğru tespit edilmiş (localStorage kilidi) ama **kilidin
tarayıcıda olması zaten hatanın kendisi.**

Üç ayrı sorun iç içe:

### Sorun A — Kilit yanlış yerde

Günün turu kilidi yalnızca tarayıcıda tutuluyor. Bu şu demek:

- Tarayıcı verisini silen kişi aynı turu tekrar oynayıp lige ikinci kez
  puan yazdırabilir
- Farklı tarayıcıdan giren aynı kişi turu tekrar oynayabilir
- Ve şu anki durum: tarayıcı "oynadın" diyor, sunucu hiç haberdar değil

**Doğrusu:** gerçek kilit sunucuda. `tur_sonuc` tablosundaki benzersiz
kısıt zaten bunu yapıyor. Tarayıcıdaki kilit yalnızca arayüz kolaylığı
olmalı — kullanıcıyı boşuna oynatmamak için. Giriş yapmış kullanıcının
kilit durumu **sunucudan okunmalı**, localStorage'dan değil.

### Sorun B — Misafirken oynanan tur kayboluyor

Kullanıcı giriş yapmadan günün turunu oynarsa, sonra üye olsa bile o
turu lige yazdıramıyor. Gün bitiyor, puan yok.

**Çözüm iki katmanlı:**

1. Günün Turu ekranında, giriş yapmamış kullanıcıya **oynamadan önce**
   uyarı: "Giriş yaparsan bugünkü turun lige işler." — engel değil,
   bilgi.
2. Tur bitince ve kullanıcı hâlâ misafirse: "Bu turu lige işlemek için
   giriş yap" bağlantısı. Giriş yapılırsa o turun tohumu ve zinciri
   sunucuya gönderilir. **Sunucu zaten zinciri doğruluyor**, yani bu
   güvenli — uydurulamaz. Yalnızca hız primi sıfırlanır, çünkü sürenin
   doğruluğu kanıtlanamaz.

### Sorun C — Tetikleyici doğrulanmamış

`tur_sonuc` boş olduğu için lig tetikleyicisinin gerçekten çalışıp
çalışmadığı hiç test edilmemiş. Bu, bir sonraki hatanın saklandığı yer.

**Yapılacak:** doğrudan SQL ile birkaç sahte `tur_sonuc` satırı yazıp
`lig_gunluk` ve `lig_donem` tablolarının doğru güncellendiğini kanıtlayan
bir test. Arayüzden değil, veritabanı seviyesinde.

---

## 2. Lig mekaniği — nasıl çalışıyor

Sorduğun soru: "İzzet günlükte 250, haftalıkta 500, aylıkta 2500 mü olacak?"

Mantık şu:

| Tablo | Ne toplanıyor | Sıfırlanma |
|---|---|---|
| **Günlük** | O günkü Günün Turu puanı. Tek tur, tek puan. | Her gece 00:00 |
| **Haftalık** | O haftanın günlük puanlarının toplamı | Pazartesi 00:00 |
| **Aylık** | O ayın günlük puanlarının toplamı | Ayın 1'i |

Yani haftalık, günlüklerin toplamı. Aylık da öyle. Ayrı ayrı
kazanılmıyor — biri diğerini besliyor.

**Her seviyenin kendi tablosu var.** Oyuncu o gün hangi seviyede
oynadıysa o seviyenin tablosuna yazılıyor. "3 hanede en çok yapan" ile
"4 hanede en çok yapan" ayrı yarışlar.

### Puanlar çok küçük — büyütmek gerek

Şu anki puanlama 0–15 aralığında. Günde tek tur olduğu için:

- Günlük en çok: ~15
- Haftalık en çok: ~105
- Aylık en çok: ~450

Senin kafandaki 250/500/2500 ile uyuşmuyor ve haklısın — **küçük sayılar
küçük hissettiriyor.** Çözüm basit: Günün Turu puanını 10 ile çarpmak.

| | Şimdi | Olması gereken |
|---|---|---|
| Tam isabet | 15 | **150** |
| Günlük en çok | 15 | **150** |
| Haftalık en çok | 105 | **1.050** |
| Aylık en çok | 450 | **4.500** |

Oyun aynı, sayılar tatmin edici. Bu sadece Günün Turu için; antrenman
puanları ayrı hesaplanıyor.

---

## 3. Antrenmanın sıralamaya yazılması

İstediğin şey doğru ama **doğrudan lige eklenemez.** Sebebi:

> Antrenman sınırsız. Günde 200 tur oynayan, günde 1 tur oynayanı her
> zaman geçer. Lig o an "kim daha iyi" değil "kimin daha çok vakti var"
> tablosuna dönüşür. Bu, kelimetahmin'in bilerek çözdüğü problem.

Ama çözmek istediğin ihtiyaç gerçek: **oyuncu neler başardığını
görmeli.** Bunun doğru aracı lig değil, ikisi:

### a) Oyuncu seviyesi (XP)

Antrenman puanları XP olarak birikir, hiç sıfırlanmaz, herkes kendi
hızında ilerler. Kimseyle yarışmaz, sadece büyür.

| Seviye | Gereken XP | Unvan |
|---|---|---|
| 1 | 0 | Çaylak |
| 2 | 500 | Hesapçı |
| 3 | 2.000 | Zihin İşçisi |
| 4 | 5.000 | Rakam Ustası |
| 5 | 12.000 | Zihin Turu Ustası |

Profilde ve kurulum ekranında görünür. Antrenman artık "boşa oynanan"
bir şey olmaktan çıkar.

### b) Ayrı bir "Antrenman" sekmesi

Lig ekranında **üçüncü bir sekme**: Günlük / Haftalık / Aylık'ın yanına
**Antrenman**. Haftalık sıfırlanır, "en çok antrenman puanı" gösterir.

Kritik: bu sekmenin başlığında açıkça yazsın — *"Çalışkanlık tablosu.
Beceri sıralaması için Günün Turu'na bakın."* Böylece iki tablo
birbirini bozmaz, ikisi de kendi işini yapar.

> **Güvenlik notu:** Antrenman puanları lige/XP'ye yazılacaksa artık
> onlar da sunucuda doğrulanmalı. Şu an antrenman tamamen tarayıcıda
> çalışıyor; ödül verilmeye başlandığı an hile hedefi olur.

---

## 4. Kesintisiz seri ödülü

Fikrin doğru ve tutundurmanın en kanıtlanmış aracı. Ama seri ödülü
**beceri ligine karışmamalı** — yoksa 30 gün üst üste kötü oynayan,
5 gün mükemmel oynayanı geçer.

Doğru yer: XP ve rozet.

| Koşul | Ödül |
|---|---|
| Günün turunu tamamla | +10 XP |
| 3 gün üst üste | +25 XP |
| 7 gün üst üste | +75 XP + "Haftalık" rozeti |
| 30 gün üst üste | +300 XP + "Aylık" rozeti |
| 100 gün üst üste | +1.000 XP + "Yüz Gün" rozeti |

**Kural: puan oynamadan verilmez.** Uygulamayı açmak yetmez, günün
turunu bitirmek gerekir. Senin koyduğun kural doğru, aynen kalsın.

Seri kırılınca sıfırlanır ama **ayda bir "seri koruma" hakkı** olsun —
bir gün kaçıran seriyi kaybetmesin. Bu, seriyi kaybeden kişinin oyunu
tamamen bırakmasını engelliyor (Duolingo'nun en etkili mekaniği).

---

## 5. Oyuncu sayısı gösterimi — sahte sayı kullanma

Sen "gerçeği yansıtmak zorunda değil" dedin. Buna katılmıyorum ve
sebebini açıkça yazayım:

**Neden yapılmamalı:**

1. **Yakalanır.** İki kişi aynı anda ekrana bakıp farklı/aynı sayıyı
   görürse anlaşılır. Ekran görüntüsü alınır, paylaşılır.
2. **Marka konumun buna zıt.** "Reklamsız, dürüst oyun" diye
   konumlanıyorsun. Yakalandığında kaybettiğin şey birkaç kullanıcı
   değil, güvenilirliğin.
3. **Gerek yok** — gerçeğini göstermenin yolu var.

**Bunun yerine gerçek veri:**

| Gösterge | Kaynak | Ne zaman göster |
|---|---|---|
| "Şu an X kişi oynuyor" | Supabase Realtime Presence — gerçek, bedava | X ≥ 15 iken |
| "Bugün X kişi oynadı" | `tur_sonuc` sayımı | X ≥ 30 iken |
| "Bugünün turunu X kişi tam bildi" | `tur_sonuc` where uzaklik=0 | X ≥ 10 iken |

**Eşiğin altındayken sayı hiç gösterilmez.** Boş bir sayı göstermek
yerine hiç göstermemek, sahte sayı göstermekten de iyidir. Kullanıcı
yokluğu fark etmez; yalan söylediğini fark eder.

Üçüncüsü özellikle güçlü: *"Bugünün turunu 47 kişi tam bildi"* cümlesi
hem gerçek hem kışkırtıcı. "Ben bilemedim ama 47 kişi bildi" duygusu,
sahte bir oyuncu sayacından çok daha etkili.

**"Ahmet günün turunda" gibi isimli gösterim yapılmamalı** — KVKK
açısından kişisel veri ve rahatsız edici. Onun yerine son tam isabet
yapanların kullanıcı adları lig tablosunda zaten görünüyor.

---

## 6. Arayüz düzeltmeleri

- **Hamburger menü her sayfada** görünsün (lig, profil, sonuç dahil)
- **"← Ana sayfa" ifadesi kaldırılsın** — web sitesi hissi veriyor.
  Yerine sadece bir geri oku (←) ya da ev ikonu. Metin yok.
- Menüde artık şunlar olmalı: Lig, Profil, Nasıl oynanır, Ses,
  Giriş/Çıkış

---

## 7. "Nasıl oynanır" sayfası

Şu an kurallar hiçbir yerde yazılı değil. Yazılması gerekenler:

**Oyun**
- Taşları birleştirerek hedefe ulaşma
- Her taş bir kez kullanılır
- Ara sonuçlar tam sayı ve pozitif olmalı
- Tam isabet, yakın, uzak puanlama

**Modlar**
- Günün Turu: günde bir, herkese aynı, lige işler
- Antrenman: sınırsız, XP kazandırır, lige işlemez

**Jokerler**
- Üç joker, bedelleri, ne işe yaradıkları

**Lig**
- Günlük / haftalık / aylık nasıl birikiyor
- Seviye başına ayrı tablo
- Günlük tabloya o günün tek turu yazılır

**Seri ve XP**
- Seri ödülleri tablosu
- Oyuncu seviyeleri ve unvanlar
- Seri koruma hakkı

---

## Claude Code komutu

> Faz 3C — sıralama hatası, lig mekaniği ve tutundurma.
>
> **1. Sıralama hatası (öncelikli).** Günün turu kilidi yalnızca
> localStorage'da; bu hatanın kendisi. Gerçek kilit sunucuda olmalı,
> tarayıcıdaki yalnızca arayüz kolaylığı. Giriş yapmış kullanıcının
> kilit durumu sunucudan okunsun.
>
> Ayrıca misafirken oynanan tur kayboluyor. İki şey ekle: (a) Günün
> Turu ekranında giriş yapmamış kullanıcıya oynamadan önce "Giriş
> yaparsan bugünkü turun lige işler" bilgisi — engel değil, not.
> (b) Tur bitince kullanıcı hâlâ misafirse "Bu turu lige işlemek için
> giriş yap" bağlantısı; giriş yapılınca o turun tohumu ve zinciri
> sunucuya gönderilsin. Sunucu zaten zinciri doğruladığı için bu
> güvenli, ama hız primi sıfırlansın çünkü sürenin doğruluğu
> kanıtlanamaz.
>
> `tur_sonuc` hiç dolmadığı için lig tetikleyicisi hiç test edilmedi.
> Doğrudan SQL ile sahte satırlar yazıp `lig_gunluk` ve `lig_donem`
> tablolarının doğru güncellendiğini kanıtlayan bir test yaz.
>
> **2. Günün Turu puanlarını 10 ile çarp.** Şu an 0–15 aralığı çok
> küçük hissettiriyor. Tam isabet ~150 olsun; haftalık ~1.000, aylık
> ~4.500 aralığına çıksın. Antrenman puanlaması ayrı kalsın.
>
> **3. Oyuncu seviyesi (XP).** Antrenman puanları XP olarak biriksin,
> hiç sıfırlanmasın. Seviyeler: 1 Çaylak (0), 2 Hesapçı (500),
> 3 Zihin İşçisi (2.000), 4 Rakam Ustası (5.000), 5 Zihin Turu Ustası
> (12.000). Profilde ve kurulum ekranında görünsün.
>
> **4. Lig ekranına dördüncü sekme: Antrenman.** Haftalık sıfırlanan
> "en çok antrenman puanı" tablosu. Başlığında açıkça yazsın:
> "Çalışkanlık tablosu. Beceri sıralaması için Günün Turu'na bakın."
> Antrenman lige ödül verdiği için artık antrenman turları da sunucuda
> doğrulansın — şu an tamamen tarayıcıda çalışıyor ve hile hedefi olur.
>
> **5. Seri ödülleri.** Günün turunu tamamla +10 XP, 3 gün +25,
> 7 gün +75 ve "Haftalık" rozeti, 30 gün +300 ve "Aylık" rozeti,
> 100 gün +1.000 ve "Yüz Gün" rozeti. **Puan oynamadan verilmez** —
> uygulamayı açmak yetmez, turu bitirmek gerekir. Ayda bir "seri
> koruma" hakkı olsun: bir gün kaçıran seriyi kaybetmesin.
> Seri ödülleri XP'ye gitsin, beceri ligine karışmasın.
>
> **6. Gerçek oyuncu sayıları.** Supabase Realtime Presence ile
> "Şu an X kişi oynuyor" (yalnızca X ≥ 15 iken göster), `tur_sonuc`
> sayımıyla "Bugün X kişi oynadı" (X ≥ 30 iken) ve "Bugünün turunu
> X kişi tam bildi" (X ≥ 10 iken). **Eşiğin altındayken hiç gösterme.**
> Sahte sayı üretme — gerçek olmayan sayı yakalandığında markanın
> güvenilirliğini kaybettirir. Oyun ekranında bu sayaçlar görünmesin,
> yalnızca kurulum ve lig ekranlarında.
>
> **7. Arayüz.** Hamburger menü her sayfada görünsün (lig, profil,
> sonuç dahil). Lig ekranındaki "← Ana sayfa" metnini kaldır, yerine
> sadece geri oku ya da ev ikonu koy — metin oyun hissini kırıyor.
> Menü öğeleri: Lig, Profil, Nasıl oynanır, Ses, Giriş/Çıkış.
>
> **8. "Nasıl oynanır" sayfası.** Şu an kurallar hiçbir yerde yazılı
> değil. Şunları içersin: oyun kuralları (taşlar bir kez kullanılır,
> ara sonuçlar tam sayı ve pozitif olmalı, puanlama), modlar (Günün
> Turu günde bir ve lige işler, Antrenman sınırsız ve XP kazandırır),
> jokerler ve bedelleri, lig mekaniği (günlük/haftalık/aylık nasıl
> birikiyor, seviye başına ayrı tablo), seri ödülleri ve XP seviyeleri.
>
> Bitince tüm testleri çalıştır ve sonuçları anlat.
