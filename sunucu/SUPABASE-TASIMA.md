# Supabase'i kendi sunucumuza taşıma

**Durum: yarım.** Yığın kuruldu ama henüz çalıştırılmadı. Bulut
projesi (`ruoyofzujzmhwvumquzu`) hâlâ canlıda ve dokunulmadı — geri
dönüş yolu açık.

## Neden taşınıyor

İki sebep: her şeyin tek sunucuda olması ve ileride çıkacak ücret
(Supabase Pro aylık 25 dolar; Türkiye şartlarında anlamlı bir gider).
Bugün ücretsiz katmandayız — 15 MB veritabanı, 5 kullanıcı — yani
taşıma bugünkü bir faturayı kesmiyor, ileriye dönük bir karar.

## Neden "sadece veritabanını taşımak" yetmiyor

Supabase'de duran şeyler:

| Ne | Büyüklük |
|---|---|
| Veritabanı | 20 tablo, 15 MB, 7 tetikleyici, 9 fonksiyon |
| Güvenlik kuralları (RLS) | 25 politika |
| Kimlik (Auth) | 5 kullanıcı, e-posta + Google |
| Edge Functions | 10 fonksiyon |
| Realtime | düello ve arenanın tamamı |

Veritabanı işin kolay kısmı. Auth, Realtime ve Edge Functions
olmadan düello, arena ve lig çalışmaz. Bu yüzden **Supabase'in
kendisi kendi sunucumuzda çalıştırılıyor** — kod değişmiyor, yalnızca
adres değişiyor.

## Yapılanlar

- Coolify'da `tamisabet-supabase` servisi kuruldu (proje `tamisabet`).
- Alan adı `api.tamisabet.tr` olarak ayarlandı; DNS zaten sunucuya
  bakıyor, ayrıca kayıt açmaya gerek yok.
- Giriş dönüş adresleri ayarlandı: `https://tamisabet.tr`,
  `https://www.tamisabet.tr` ve `com.tamisabet.app://giris`.
- E-posta kaydı açık, otomatik onay kapalı (bulut projedeki davranış).

## Kalan adımlar

1. **Yığını çalıştır.** Coolify → `tamisabet` → `tamisabet-supabase`
   → Deploy. İlk açılışta on beşe yakın kapsayıcı iniyor, birkaç
   dakika sürer.
2. **Anahtarları al.** `ANON_KEY` ve `SERVICE_ROLE_KEY` Coolify'ın
   değişkenler sekmesinde. Anon anahtarı uygulamaya, servis anahtarı
   taşıma betiğine gerekiyor.
3. **Şema ve veriyi taşı.** Buluttan `pg_dump`, buraya `psql`.
   `public` ve `auth` şemalarının ikisi birden — auth şeması
   taşınmazsa kullanıcılar parolalarıyla giremez.
4. **Edge Functions'ı dağıt.** Onu da `--import-map` ile; kendi
   sunucumuzdaki uç nokta `https://api.tamisabet.tr/functions/v1/`.
5. **Uygulamayı çevir.** Coolify'daki `VITE_SUPABASE_URL` ve
   `VITE_SUPABASE_ANON_KEY` yeni değerlerle güncellenip redeploy.
6. **Google girişini ayarla.** Google Cloud Console'daki yetkili
   dönüş adresine `https://api.tamisabet.tr/auth/v1/callback` eklenir.
7. **Yedek kur.** Bu artık bizim işimiz: günlük `pg_dump` + sunucu
   dışına kopya. Bulut Supabase bunu kendisi yapıyordu; kendi
   sunucumuzda yapmazsak tek disk arızası her şeyi götürür.
8. **Doğrula.** Giriş, günün turu, lig, düello, arena — hepsi tek tek.
9. **Bulut projesini bir süre kapatma.** En az bir hafta yedek olarak
   dursun; her şey oturduktan sonra silinir.

## Bilinmesi gerekenler

- **Yedekleme ve güncelleme artık bizim sorumluluğumuz.** Taşımanın
  asıl bedeli bu, ücret değil.
- **Mevcut oturumlar kapanır.** JWT gizli anahtarı değiştiği için
  herkes yeniden giriş yapar. Beş kullanıcıyla sorun değil.
- **Taşıma sırasında kısa bir kesinti olur.** Veriyi kopyalarken
  yazılan bir tur kaybolmasın diye site kısa süre kapatılmalı.
