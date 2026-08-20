# Play Store Yayın Notları — Zihin Turu

> Bu belge AAB yüklemeden önce doldurulacak formlar ve dikkat edilecek
> noktaları özetler. Son güncelleme: 2026-08-20.

---

## 1. Data Safety Formu Özeti

Play Console → App content → Data safety bölümünde aşağıdaki beyanlar
yapılmalıdır.

### Toplanan / paylaşılan veriler

| Veri türü (Play Store kategorisi) | Toplanıyor mu? | Paylaşılıyor mu? | Zorunlu mu? | Amaç | Silinebilir mi? |
|---|---|---|---|---|---|
| **E-posta adresi** | ✅ | ❌ | Evet (hesap) | Hesap oluşturma, kimlik doğrulama (Supabase Auth) | Evet — hesap silinince 30 gün içinde kalıcı silinir |
| **Doğum yılı** | ✅ | ❌ | Evet | Yaş doğrulaması (asgari yaş kontrolü, reklam kişiselleştirme kararı) | Evet (yalnızca cihazda saklanır) |
| **Kullanıcı adı / görünen ad** | ✅ | Kısmen (lig tablosunda diğer oyunculara) | Evet (hesap) | Profil, lig sıralaması | Evet |
| **Oyun ilerleme verisi** | ✅ | ❌ | Otomatik | Skor, seri, XP, seviye, açılmış modlar | Evet |
| **Çökme günlükleri** | ✅ | ❌ | Kapatılabilir | Uygulama kararlılığı (Firebase Crashlytics) | Otomatik (90 gün sonra Firebase siler) |
| **Uygulama kullanım olayları** | ✅ | ❌ | Kapatılabilir | Analitik (Firebase Analytics) — ekran açılışı, tur tamamlama | Evet (hesap silinince) |
| **Cihaz / tarayıcı bilgisi** | ✅ | ❌ | Otomatik | Supabase oturum yönetimi (user-agent) | Evet |
| **Reklam tanımlayıcıları** | Koşullu | ❌ | — | 18 altına AAID toplanmaz. 18+ kullanıcıya UMP onayı ile kişiselleştirilmiş reklam gösterilebilir | — |

### Güvenlik

- **Tüm veri aktarımı HTTPS üzerinden şifrelenir** (Supabase + Firebase)
- Kullanıcı verisini silme yolu var: hesap silme → 30 gün içinde kalıcı silme

### Formda seçilecek cevaplar

- "Does your app collect or share any of the required user data types?" → **Yes**
- "Is all of the user data collected by your app encrypted in transit?" → **Yes**
- "Do you provide a way for users to request that their data is deleted?" → **Yes**
- Bildirim tercihi: **cihaz üstünde yerel**, sunucuya token gönderilmiyor
- "Does your app show ads?" → **Yes**
- "Does your app include rewarded ads?" → **Yes** (ek joker, antrenman tekrarı, seri koruma)
- "Are ads personalized?" → **Depends on user age and consent** (18+ UMP onay, 18 altı her zaman non-personalized)
- "Does your app contain in-app purchases?" → **Yes** (Destekçi aboneliği — iskelet, henüz aktif değil)

---

## 2. Çocuklar ve Aileler Politikası Değerlendirmesi

### Güncel durum (A görevi sonrası)

- **Hedef yaş:** 13+ (kayıt asgari yaş 13, misafir olarak yaş sınırı yok)
- **AdMob ayarları:**
  - `tagForChildDirectedTreatment = false` (COPPA 13 altı içindi; 13 altı kayıt olmuyor)
  - `tagForUnderAgeOfConsent = false` (yerine UMP onay akışı var)
  - `maxAdContentRating = 'Teen'` (13+ hedef kitle)
- **Reklam kişiselleştirmesi:**
  - 18 altı → her zaman kişiselleştirilmemiş
  - 18+ → UMP ile onay sorulur; onay vermezse kişiselleştirilmemiş
- **Hesap oluşturma:** E-posta + sihirli bağlantı veya Google OAuth
- **Yaş kontrolü:** Kayıt sırasında doğum yılı sorulur; 13 altı engellenir; 13-17 veli onayı beyanı istenir
- **Sohbet / mesajlaşma:** Yok
- **Kullanıcı oluşturmalı içerik:** Yalnızca kullanıcı adı

### Play Store "Families" programına girmeli mi?

**Hayır.** Gerekçe:

1. Hedef yaş grubu 13+ olarak beyan edilecek. Families programı yalnızca
   çocuklara yönelik uygulamalar için zorunludur.

2. **Risk değerlendirmesi:** Google, uygulamanın gerçekte çocuklara hitap
   edip etmediğini içeriğe bakarak kendi değerlendirir. Zihin Turu bir
   matematik bulmacası — bu tür uygulamalar Google'ın "çocuklara yönelik"
   olarak değerlendirebileceği bir kategori. Ancak:
   - Kayıt asgari yaşı 13 olarak uygulanıyor
   - İçerikte çocuk görseli, çocuklara özel dil veya çocuk karakteri yok
   - Lig/sıralama sistemi yetişkin oyun mekaniklerine yakın
   - "Isınma · 2 hane" seviyesi basit ama bu "13+ uygulamada kolay mod"
     olarak savunulabilir

   **Risk düşük ama sıfır değil.** Google değerlendirmeyi tetiklerse
   Families policy uyumu istenebilir. Bu durumda yapılacaklar:
   - "Isınma" seviye adını daha az çocuksu bir isme çevir
   - AdMob families self-certification başvurusu yap
   - Neutral age gate ekle

### Play Console → Target audience bölümünde seçilecekler

- **Target age group:** **"13 and up"**
- **"Is your app designed specifically for children?"** → **No**
- **"Does your app contain ads?"** → **Yes**
- **"Are ads personalized?"** → **For users 18+ who consent, yes**

---

## 3. AAB Üretimi

### Ön koşul: Keystore

`local.properties` dosyasına aşağıdaki satırlar eklenmeli:

```properties
ZIHIN_KEYSTORE_FILE=/path/to/zihinturu-release.jks
ZIHIN_KEYSTORE_PASSWORD=...
ZIHIN_KEY_ALIAS=zihinturu
ZIHIN_KEY_PASSWORD=...
```

### Derleme komutu

```bash
cd uygulama/android
./gradlew bundleRelease
```

### Çıktı

```
uygulama/android/app/build/outputs/bundle/release/app-release.aab
```

### Sürüm bilgisi

- `versionCode`: 6
- `versionName`: 1.2.0
- `targetSdk`: 36 (Play Store'un 2025 gereksinimine uygun)
- R8 minify + shrinkResources: açık
- ProGuard kuralları: Capacitor, Firebase, AdMob, Crashlytics korunuyor
