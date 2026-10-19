# Dağıtım — Coolify (tamisabet.tr)

Site 19 Ekim 2026'da Cloudflare Pages'ten kendi sunucumuzdaki
Coolify'a taşındı. Supabase bulutta kaldı; ona dokunulmadı.

## Sunucu

| | |
|---|---|
| Adres | 213.199.39.221 (Ubuntu 24.04) |
| Coolify | 4.4.6 |
| Ters vekil | Traefik v3.6 (`coolify-proxy`) — **nginx değil** |
| Kaynak | 6 çekirdek, 23 GB bellek, 115 GB boş disk |

Sunucuda başka dört proje çalışıyor (`1app.tr`, `guessclash.com`,
`parazade.com`, `haciserif.tr`). Hepsi Traefik üzerinden alan adıyla
yönleniyor; 80 ve 443 portlarını yalnızca Traefik tutuyor, her proje
kendi kapsayıcısında. Yeni bir site eklemek port çakışması
doğurmuyor — **ayrı port açmaya gerek yok ve açılmamalı.**

## Alan adı

`tamisabet.tr` ve `www.tamisabet.tr` doğrudan bu sunucunun IP'sine
çözülüyor. Ad sunucuları Cloudflare'de ama kayıt **gri bulutta**
(proxy kapalı) — yanıt veren IP Cloudflare'in değil, sunucunun kendi
IP'si.

Bunun tek pratik sonucu şu: **Let's Encrypt HTTP doğrulaması
çalışır.** Cloudflare Origin Certificate'a gerek yok. Proxy ileride
açılırsa (turuncu bulut) durum değişir; o zaman ya Origin Certificate
ya da DNS doğrulaması gerekir.

## Coolify kaynağı

- **Tip:** Static Site (Nixpacks değil)
- **Depo:** `izzet-lab/zihin-turu`, dal `main`
- **Derleme komutu:** `npm run insa`
- **Çıktı dizini:** `uygulama/dist`
- **Node sürümü:** 20
- **Alan adı:** `https://tamisabet.tr` (+ `www` yönlendirmesi)
- **Otomatik dağıtım:** `main` dalına push'ta açık

### Ortam değişkenleri

`VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` Coolify arayüzünden
girilir. **Bu depoda ya da bu dosyada değerleri yazılı değildir ve
yazılmayacaktır.** İkisi de derleme anında gömülür (`VITE_` önekli
değişkenler istemciye gider), bu yüzden "Build Variable" olarak
işaretlenmeleri gerekir.

### SPA yönlendirmesi

Uygulama tek sayfalık; `/lig` diye bir dosya yok. Doğrudan o adrese
girilirse statik sunucu 404 verir. İki yol var:

1. Coolify'ın Static Site ayarlarındaki **"Is it a SPA?"** anahtarı.
2. `uygulama/nginx.conf` dosyasını özel yapılandırma olarak vermek.

İkincisi tercih edildi çünkü SPA anahtarı yalnızca `try_files`
ekliyor; bizim ayrıca iki şeye daha ihtiyacımız var:

- `sw.js`, `index.html` ve manifest **önbelleklenmemeli** (Pages'te
  bunu `public/_headers` yapıyordu). Yoksa oyuncu günlerce eski
  sürümde takılır.
- `/.well-known/assetlinks.json` **yönlendirmesiz** servis edilmeli.
  SPA yedeğinin altında kalırsa index.html döner ve Android App Links
  doğrulaması sessizce başarısız olur.

`public/_redirects` ve `public/_headers` dosyaları Cloudflare Pages'e
özgüdür; Coolify'da hükümleri yoktur. Pages'e dönme ihtimaline karşı
silinmediler, ama **tek doğru kaynak artık `nginx.conf`.**

## Uygulama bağlantıları (App Links)

`/.well-known/assetlinks.json` depoda, `uygulama/public/` altında.
İçindeki parmak izi mevcut imza anahtarından alındı:

```
SHA-256: 02:C3:1B:...:E2:16   (CN=Zihin Turu)
```

Android tarafında `AndroidManifest.xml` içine `autoVerify="true"` olan
bir intent-filter eklendi. İkisi birden olmadan bağlantılar uygulamayı
açmaz.

**Google Play App Signing uyarısı:** uygulama Play üzerinden
yayınlanırsa imzalayan anahtar Play'inki olur ve assetlinks.json'a
Play'in parmak izi de eklenmelidir. İki parmak izi aynı dosyada yan
yana durabilir.

**iOS:** `apple-app-site-association` dosyası **bilerek
oluşturulmadı.** iOS projesi henüz yok (`uygulama/ios` dizini yok) ve
Team ID bilinmiyor. Yer tutucu bir dosya koymak zararlı olurdu: Apple
bu dosyayı kendi CDN'inde uzun süre önbelleğe alıyor, yanlış içerik
sonradan düzeltilse bile bir süre yanlış kalıyor. iOS paketi çıktığında
eklenir; nginx yapılandırmasında yeri hazır bekliyor.

## Dağıtım sonrası denetim listesi

- [ ] `https://tamisabet.tr` açılıyor
- [ ] SSL sertifikası geçerli (Let's Encrypt, Traefik varsayılanı değil)
- [ ] `https://tamisabet.tr/lig` doğrudan açılıyor (404 vermiyor)
- [ ] `https://tamisabet.tr/.well-known/assetlinks.json` → 200,
      `application/json`, yönlendirme yok
- [ ] Giriş çalışıyor (Supabase Auth → Redirect URL listesinde
      `https://tamisabet.tr` olmalı)
- [ ] Günün turu oynanıyor ve lige işliyor
- [ ] Diğer dört proje hâlâ ayakta
