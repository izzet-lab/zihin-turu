# Değişiklik günlüğü

Bu dosya, oyun dengesini veya veri yapısını etkileyen değişiklikleri kaydeder.
Küçük hata düzeltmeleri ve görsel rötuşlar buraya yazılmaz.

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
