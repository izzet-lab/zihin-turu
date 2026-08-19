# CLAUDE.md

Bu dosya deponun köküne konur. Claude Code her oturumda otomatik okur.
Amacı: her yeni sohbette aynı şeyleri baştan anlatmak zorunda kalmamak.

---

## Proje

Türkçe zihin oyunu platformu. İki oyun, tek altyapı:

- **Sayı turu** — 6 rakam verilir, dört işlemle hedef sayıya ulaşılır
- **Kelime turu** — 8 harf verilir, en uzun kelime türetilir *(Faz 6)*

Platform oyunu bilmez. Oyunlar `TurSaglayici` arayüzüyle takılır.

## Kiminle konuşuyorsun

Proje sahibi kod yazmıyor ve okumuyor. Bu şu demek:

- **Ne yaptığını Türkçe ve sade anlat.** Değişkenle değil, davranışla:
  "artık süre bitince tur kapanıyor", "artık raftaki taşlar yeniden
  boyutlanıyor" gibi.
- **Kod parçası yapıştırma** — açıklaması gerekiyorsa cümleyle açıkla.
- **Her değişiklikten sonra testleri çalıştır ve sonucu söyle.**
  Kırmızıysa ilerlemeden düzelt.
- Bir şey riskliyse ya da iki yol varsa, **karar verip gerekçesini
  söyle.** Seçenek listesi sunup beklemek işi yavaşlatıyor.

## Değişmez kurallar

1. **Oyun mantığı tek yerde.** Kural, üretim, doğrulama ve puanlama
   yalnızca `paketler/oyun-*` içinde yaşar. Arayüzde veya sunucu
   fonksiyonunda kural kopyası bulunursa bu bir hatadır.
2. **Doğrulama sunucuda.** İstemci "buldum" diyemez. Gönderilen cevap
   Edge Function'da sıfırdan yeniden hesaplanır. Puanı sunucu verir.
3. **Tur içeriği saklanmaz, tohum saklanır.** Bulmaca `tohum → tur`
   fonksiyonuyla yeniden üretilir. Rövanş, maç tekrarı ve günün turu
   bundan bedavaya gelir.
4. **Rekabet modlarında süre zorunlu.** Süresiz yalnızca Antrenman'da,
   ve Antrenman lige işlemez.
5. **Reklam yok.** Reklam SDK'sı, izleyici takibi, üçüncü taraf
   analitik eklenmez. Sadece kendi sayaçlarımız.
6. **Çözüm sızmaz.** Tur bitmeden çözüm istemciye gönderilmez.
   Paylaşım kartında adımlar, işlem işaretleri ve ara sonuçlar yer almaz.
7. **Mobil önce.** Her ekran önce 360px genişlikte doğru çalışır.
   Dokunma hedefleri en az 44px.
8. **Türkçe.** Kod içindeki isimler, yorumlar ve arayüz metinleri
   Türkçe. Değişken adlarında Türkçe karakter yok (`buyukSayi`,
   `büyükSayı` değil).

## Testler

```bash
npm test          # birim + entegrasyon
npm run e2e       # Playwright, gerçek tarayıcı
npm run insa      # derleme
```

Kural: **her faz kendi kabul testiyle biter.** Test yazmadan özellik
tamamlanmış sayılmaz. Test, proje sahibinin kodu okumadan
"çalışıyor mu?" sorusunu cevaplama yolu.

## Mimari

```
paketler/cekirdek       TurSaglayici arayüzü, ortak tipler, tohumlu rastgelelik
paketler/oyun-sayi      sayı turu: üretici, çözücü, doğrulayıcı, puanlayıcı, bot
paketler/oyun-kelime    kelime turu (Faz 6)
uygulama                React + Vite arayüz, PWA
sunucu/fonksiyonlar     Supabase Edge Functions: doğrulama, eşleştirme, bot
sunucu/gocler           SQL şema göçleri
testler                 birim, entegrasyon, e2e
```

### TurSaglayici arayüzü

```ts
interface TurSaglayici {
  ad: 'sayi' | 'kelime';
  seviyeler: Seviye[];
  turUret(seviye: string, tohum: number): Tur;
  dogrula(tur: Tur, cevap: Cevap): Dogrulama;
  puanla(seviye: string, d: Dogrulama, kalanSn: number, ilkMi: boolean): Puan;
  cozumBul(tur: Tur, sinirMs?: number): Cozum;
}
```

Platform yalnızca bu arayüzü çağırır. Platform kodunda `hedef`,
`rakam`, `harf` gibi oyuna özgü kelimeler geçmemeli.

## Yığın

TypeScript · React + Vite · Tailwind · Supabase (Postgres, Auth,
Realtime, Edge Functions) · Cloudflare Pages · Vitest + Playwright ·
Capacitor (Faz 7)

---

## Faz faz komutlar

Aşağıdakileri sırayla Claude Code'a ver. Her komut bir oturum.
Bir faz bitmeden sonrakine geçme.

### Faz 0 — Kurulum

> Bu depoyu sıfırdan kur: TypeScript monorepo, npm workspaces ile
> `paketler/cekirdek`, `paketler/oyun-sayi`, `uygulama`, `sunucu`,
> `testler` klasörleri. Uygulama React + Vite + Tailwind olsun,
> Türkçe yerelleştirilmiş. Vitest ve Playwright kurulu gelsin.
> Cloudflare Pages'e deploy edilebilir bir "yakında" sayfası yap.
> Kurulum bitince bana ne yaptığını ve nasıl çalıştıracağımı anlat.

### Faz 1 — Çekirdek

> `CLAUDE.md`'deki `TurSaglayici` arayüzünü `paketler/cekirdek`
> içinde yaz. Sonra `tohum-kod/` klasöründeki JavaScript sayı oyunu
> mantığını TypeScript'e çevirip `paketler/oyun-sayi` içine bu
> arayüzü uygulayacak şekilde taşı. Mevcut testleri de taşı ve
> çalıştır. Her seviyede 200'er tur üretip hepsinin tam çözümlü
> olduğunu doğrulayan testi koru.
>
> *(Not: Faz 1'de beş seviye vardı. 19 Ağustos 2026'da Kolay ve Normal
> birleştirildi; artık dört seviye var — bkz. `CHANGELOG.md`.)*

### Faz 2 — Tek kişilik yayın ⭐

> Mobil öncelikli React arayüzü yap: Antrenman modu, Günün Turu,
> sonuç ekranı ve paylaşım kartı. Günün turu tarihten türeyen
> tohumla üretilsin, günde bir hak olsun, ilerleme tarayıcıda
> saklansın. PWA yap: manifest, servis çalışanı, ana ekrana ekleme,
> çevrimdışı çalışma. Üyelik yok, misafir oynuyor.
> Playwright ile şu senaryoyu test et: günün turunu oyna, tam isabet
> yap, paylaşım kartı üretilsin, sayfayı yenile, günlük kilit dursun.

### Faz 3 — Kimlik ve lig

> Supabase Auth kur: e-posta ve Google girişi. Misafir oynamaya devam
> etsin; üye olduğunda misafirken biriken ilerleme yeni hesaba
> devrolsun — bu kritik, kimse ilerlemesini kaybetmemeli.
> Şema: oyuncu, mac, tur, gonderim, lig_gunluk, lig_aylik, odul.
> Seviye başına ayrı lig tablosu. Günlük tabloya oyuncunun o günkü
> EN İYİ maçı yazılsın, toplamı değil. Profil sayfaları herkese açık
> olsun (SEO). KVKK aydınlatma metni, çerez politikası ve kullanım
> koşulları sayfalarını da ekle.

### Faz 4 — Düello

> Supabase Realtime ile 1v1 düello yap. Akış: eşleştirme kuyruğu
> (ELO'ya yakın rakip), 5 tur, her turda süre. Tam isabet bulan ilk
> oyuncu turu anında kapatır; kimse bulamazsa süre sonunda en yakın
> kazanır. Rakibin yalnızca hedefe uzaklığı canlı yayınlansın —
> hangi taşı kullandığı asla gitmesin.
> Cevap doğrulaması Edge Function'da yapılsın, puanı sunucu versin.
> 8 saniyede rakip bulunamazsa bot devreye girsin; bot çözümü hazır
> almasın, kendi çözücüsünü sınırlı süreyle çalıştırsın.
> Bağlantı koparsa maç düzgün sonlansın, kısa kopmada geri dönülebilsin.
> İki tarayıcı açıp gerçek maç oynatan bir e2e testi yaz.

### Faz 5 — Arena

> 5 kişilik eşzamanlı arena yap. Sıra yok, herkes aynı anda oynar.
> İlk tam isabet turu kapatır. Eksik koltuklar botla dolar.
> Podyum ekranı, kupa ve madalya.

### Faz 6 — Kelime turu

> TDK sözlüğünden Türkçe kelime listesi hazırla (kök + çekimli
> biçimler, uzunluk indeksli). `paketler/oyun-kelime` içinde
> `TurSaglayici` arayüzünü uygulayan kelime turunu yaz: 8 harf üret,
> girilen kelimeyi sözlükte ve harf havuzunda doğrula, harf sayısına
> göre puanla, en uzun kelimeyi bul.
> **Platform kodunda hiçbir değişiklik yapma.** Değişiklik gerekiyorsa
> bu, arayüzün eksik olduğu anlamına gelir — önce bana söyle.

### Faz 7 — Mağazalar

> Capacitor ekle, iOS ve Android paketlerini üret. Mağaza görselleri,
> açıklama metinleri, gizlilik beyanı ve yaş derecelendirmesi
> bilgilerini hazırla.

---

## Sık yapılan hatalar (yapma)

- Oyun kuralını arayüze kopyalamak — tek kaynak bozulur
- İstemcinin bildirdiği puana güvenmek — hile kapısı
- Tur içeriğini veritabanına yazmak — tohum varken gereksiz
- Paylaşım kartına çözüm adımı koymak — oynamamışa cevabı verir
- Antrenman maçını lige işlemek — tablo kirlenir
- Reklam veya üçüncü taraf takip kodu eklemek — konumlandırma biter
- Kod parçası göstererek açıklama yapmak — proje sahibi kod okumuyor
