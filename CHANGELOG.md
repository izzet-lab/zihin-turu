# Değişiklik günlüğü

Bu dosya, oyun dengesini veya veri yapısını etkileyen değişiklikleri kaydeder.
Küçük hata düzeltmeleri ve görsel rötuşlar buraya yazılmaz.

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
