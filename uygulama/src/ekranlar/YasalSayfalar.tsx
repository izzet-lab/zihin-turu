/**
 * YasalSayfalar.tsx — KVKK, gizlilik, çerez, kullanım koşulları, hesap silme
 *
 * Zihin Turu projesinin gerçek durumunu yansıtan yasal metinler.
 * Her metnin başında "avukat incelemesinden geçmedi" uyarısı bulunur.
 */

import { useState } from 'react';
import { hesapSil } from '../kimlik';
import SayfaSablonu from './SayfaSablonu';

/* ── Tekrarlanan uyarı kutusu ── */
function AvukatUyarisi() {
  return (
    <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-amber-200 text-xs mb-6">
      ⚠️ <strong>Bu metin taslak niteliğindedir ve avukat incelemesinden geçmemiştir.</strong>{' '}
      Herkese açık yayından önce hukuk danışmanı tarafından gözden geçirilmelidir.
    </div>
  );
}

/* ── Ortak stil sınıfları ── */
const h2 = 'text-base font-bold text-white mt-6';
const icerik = 'space-y-4 text-sm text-slate-300 leading-relaxed';

/* ========================================================================== */
/*  KVKK AYDINLATMA METNİ                                                     */
/* ========================================================================== */
export function KVKKSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="KVKK Aydınlatma Metni"
      alt="6698 sayılı Kanun uyarınca bilgilendirme"
      onGeri={onGeri}
      cocuklar={
        <div className={icerik}>
          <AvukatUyarisi />

          <p>
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")
            kapsamında, <strong>Zihin Turu</strong> uygulamasını kullanan siz değerli
            kullanıcılarımızı bilgilendirmek amacıyla hazırlanmıştır.
          </p>
          <p>
            <strong>Son güncelleme:</strong> 19 Ağustos 2026
          </p>

          <h2 className={h2}>1. Veri Sorumlusu</h2>
          <p>
            Veri sorumlusu, Zihin Turu uygulamasını geliştiren ve işleten bireysel
            girişimcidir. İletişim: <strong>izzet@haciserif.com</strong>
          </p>

          <h2 className={h2}>2. Toplanan Kişisel Veriler</h2>
          <table className="w-full text-xs border border-slate-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Veri</th>
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Amaç</th>
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Zorunlu mu?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr><td className="px-3 py-2">E-posta adresi</td><td className="px-3 py-2">Hesap oluşturma ve giriş (sihirli bağlantı / Google OAuth)</td><td className="px-3 py-2">Evet</td></tr>
              <tr><td className="px-3 py-2">Kullanıcı adı</td><td className="px-3 py-2">Sıralama tablosunda ve profilde gösterim</td><td className="px-3 py-2">Evet</td></tr>
              <tr><td className="px-3 py-2">Oyun sonuçları</td><td className="px-3 py-2">Puan, süre, seviye, adım sayısı — ilerleme takibi ve lig sıralaması</td><td className="px-3 py-2">Otomatik</td></tr>
              <tr><td className="px-3 py-2">IP adresi</td><td className="px-3 py-2">Supabase altyapısı tarafından sunucu günlüklerinde otomatik kaydedilir</td><td className="px-3 py-2">Otomatik</td></tr>
              <tr><td className="px-3 py-2">Tarayıcı/cihaz bilgisi</td><td className="px-3 py-2">Supabase oturum yönetimi (user-agent)</td><td className="px-3 py-2">Otomatik</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500">
            Telefon numarası, adres, TC kimlik numarası gibi veriler <strong>toplanmaz</strong>.
          </p>

          <h2 className={h2}>3. Verilerin İşlenme Amaçları</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kullanıcı hesabı oluşturma ve kimlik doğrulama</li>
            <li>Oyun sonuçlarını kaydetme ve sıralama tablosu oluşturma</li>
            <li>Kullanıcı profili ve ilerleme gösterimi</li>
            <li>Hizmetin teknik olarak çalışmasını sağlama</li>
          </ul>

          <h2 className={h2}>4. Hukuki Dayanak</h2>
          <p>
            Verileriniz KVKK madde 5/2-c (sözleşmenin ifası) ve madde 5/1 (açık rıza)
            kapsamında işlenmektedir.
          </p>

          <h2 className={h2}>5. Verilerin Aktarılması</h2>
          <p>
            Verileriniz <strong>Supabase</strong> (PostgreSQL veritabanı) üzerinde,
            <strong> AWS eu-central-1 (Frankfurt, Almanya)</strong> bölgesinde
            barındırılmaktadır. Supabase, Avrupa Birliği veri koruma standartlarına
            uygun altyapı kullanmaktadır.
          </p>
          <p>
            Kimlik doğrulama için Google OAuth kullanılması durumunda, Google'ın
            gizlilik politikası da geçerlidir.
          </p>
          <p>
            Verileriniz reklam, pazarlama veya analitik amacıyla <strong>hiçbir üçüncü
            tarafla paylaşılmaz</strong>.
          </p>

          <h2 className={h2}>6. Saklama Süresi</h2>
          <p>
            Kişisel verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı
            sildiğinizde tüm verileriniz <strong>30 gün içinde</strong> kalıcı olarak
            silinir. Yasal yükümlülükler gerektirdiğinde bu süre uzayabilir.
          </p>

          <h2 className={h2}>7. Haklarınız (KVKK Madde 11)</h2>
          <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
            <li>KVKK madde 7 kapsamında <strong>silinmesini veya yok edilmesini isteme</strong></li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
            <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
          <p>
            Hesabınızı silmek için menüdeki <strong>"Hesabımı sil"</strong> seçeneğini
            kullanabilir veya <strong>izzet@haciserif.com</strong> adresine yazabilirsiniz.
          </p>

          <h2 className={h2}>8. Başvuru ve Şikâyet</h2>
          <p>
            Haklarınızı kullanmak için <strong>izzet@haciserif.com</strong> adresine
            başvurabilirsiniz. Başvurunuz en geç 30 gün içinde yanıtlanacaktır.
          </p>
          <p>
            Yanıt alamazsanız veya yanıtı yetersiz bulursanız, <strong>Kişisel Verileri
            Koruma Kurumu</strong>'na (kvkk.gov.tr) şikâyette bulunabilirsiniz.
          </p>
        </div>
      }
    />
  );
}

/* ========================================================================== */
/*  GİZLİLİK POLİTİKASI                                                       */
/* ========================================================================== */
export function GizlilikSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Gizlilik Politikası"
      alt="Verileriniz nasıl korunur"
      onGeri={onGeri}
      cocuklar={
        <div className={icerik}>
          <AvukatUyarisi />

          <p>
            Zihin Turu, kullanıcılarının gizliliğine saygı gösterir. Bu politika,
            hangi verilerin toplandığını, nasıl korunduğunu ve haklarınızın neler
            olduğunu açıklar.
          </p>
          <p>
            <strong>Son güncelleme:</strong> 19 Ağustos 2026
          </p>

          <h2 className={h2}>1. Toplanan Veriler</h2>
          <p>
            Ayrıntılı liste için <a href="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma Metni</a>'ne
            bakınız. Özetle: e-posta, kullanıcı adı, oyun sonuçları ve teknik
            bağlantı bilgileri (IP, user-agent).
          </p>

          <h2 className={h2}>2. Barındırma ve Güvenlik</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Veritabanı:</strong> Supabase (PostgreSQL) — AWS eu-central-1, Frankfurt, Almanya</li>
            <li><strong>Uygulama:</strong> Cloudflare Pages üzerinde barındırılmaktadır</li>
            <li><strong>Şifreleme:</strong> Tüm bağlantılar HTTPS/TLS ile korunur</li>
            <li><strong>Kimlik doğrulama:</strong> Supabase Auth — şifre saklanmaz, sihirli bağlantı (OTP) veya Google OAuth kullanılır</li>
          </ul>

          <h2 className={h2}>3. Üçüncü Taraf Paylaşımı</h2>
          <p>
            Kişisel verileriniz <strong>hiçbir reklam, analitik veya pazarlama
            şirketiyle paylaşılmaz</strong>. Veriler yalnızca hizmetin sunulması için
            gerekli altyapı sağlayıcılarında (Supabase, Cloudflare) işlenir.
          </p>

          <h2 className={h2}>4. Sıralama Tablosunda Görünen Bilgiler</h2>
          <p>
            Lig sıralamasında yalnızca <strong>kullanıcı adı</strong> ve
            <strong> puan</strong> görünür. E-posta adresi veya başka kişisel bilgi
            diğer kullanıcılara gösterilmez.
          </p>

          <h2 className={h2}>5. Veri Saklama Süresi</h2>
          <p>
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme
            talebinden sonra tüm veriler 30 gün içinde kalıcı olarak silinir.
          </p>

          <h2 className={h2}>6. Çocukların Gizliliği</h2>
          <p>
            Zihin Turu 13 yaş ve üzeri kullanıcılara yöneliktir. 18 yaş altındaki
            kullanıcıların velisinin bilgisi dahilinde uygulamayı kullanması önerilir.
          </p>

          <h2 className={h2}>7. Veri İhlali Bildirimi</h2>
          <p>
            Bir veri ihlali tespit edilmesi durumunda, KVKK'nın öngördüğü süre
            içinde etkilenen kullanıcılar ve Kişisel Verileri Koruma Kurumu
            bilgilendirilecektir.
          </p>

          <h2 className={h2}>8. Değişiklikler</h2>
          <p>
            Bu politika güncellenebilir. Önemli değişiklikler uygulama içinde
            duyurulacaktır.
          </p>

          <h2 className={h2}>9. İletişim</h2>
          <p>
            Gizlilik ile ilgili sorularınız için: <strong>izzet@haciserif.com</strong>
          </p>
        </div>
      }
    />
  );
}

/* ========================================================================== */
/*  ÇEREZ POLİTİKASI                                                          */
/* ========================================================================== */
export function CerezSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Çerez Politikası"
      alt="Çerez ve yerel depolama kullanımı"
      onGeri={onGeri}
      cocuklar={
        <div className={icerik}>
          <AvukatUyarisi />

          <p>
            Bu politika, Zihin Turu uygulamasının çerez ve yerel depolama
            kullanımını açıklar.
          </p>
          <p>
            <strong>Son güncelleme:</strong> 19 Ağustos 2026
          </p>

          <h2 className={h2}>1. Çerez Kullanımı</h2>
          <p>
            Zihin Turu, reklam veya analitik amaçlı çerez <strong>kullanmaz</strong>.
          </p>
          <p>
            Supabase kimlik doğrulaması için tarayıcının <code className="text-xs bg-slate-800 px-1 rounded">localStorage</code> alanında
            oturum bilgisi saklanır. Bu, hesabınıza giriş yapmanızı sağlayan
            zorunlu bir teknik mekanizmadır.
          </p>

          <h2 className={h2}>2. Yerel Depolama (localStorage)</h2>
          <p>Aşağıdaki veriler tarayıcınızda yerel olarak saklanır:</p>
          <table className="w-full text-xs border border-slate-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Veri</th>
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Amaç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr><td className="px-3 py-2">Oturum token'ı</td><td className="px-3 py-2">Giriş durumunuzu korumak (Supabase Auth)</td></tr>
              <tr><td className="px-3 py-2">Ses tercihi</td><td className="px-3 py-2">Ses açık/kapalı ayarınızı hatırlamak</td></tr>
              <tr><td className="px-3 py-2">Oyun durumu</td><td className="px-3 py-2">Devam eden turun geçici verileri</td></tr>
            </tbody>
          </table>
          <p>Bu veriler:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Yalnızca kendi tarayıcınızda okunabilir</li>
            <li>Başka sitelerle paylaşılmaz</li>
            <li>Tarayıcı verilerini temizlediğinizde silinir</li>
          </ul>

          <h2 className={h2}>3. Üçüncü Taraf Betikleri</h2>
          <p>
            Reklam, analitik veya izleme amaçlı üçüncü taraf betikleri
            <strong> kullanılmaz</strong>. Google Analytics, Facebook Pixel veya
            benzeri izleme araçları yoktur.
          </p>

          <h2 className={h2}>4. Çerez Yönetimi</h2>
          <p>
            Tarayıcınızın ayarlarından yerel depolamayı temizleyebilirsiniz.
            Bu durumda oturumunuz kapanır ve tekrar giriş yapmanız gerekir.
          </p>
        </div>
      }
    />
  );
}

/* ========================================================================== */
/*  KULLANIM KOŞULLARI                                                         */
/* ========================================================================== */
export function KullanimKosullariSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Kullanım Koşulları"
      alt="Hizmet şartları"
      onGeri={onGeri}
      cocuklar={
        <div className={icerik}>
          <AvukatUyarisi />

          <p>
            Bu koşullar, Zihin Turu uygulamasını kullanımınızı düzenler.
            Hesap oluşturarak bu koşulları kabul etmiş sayılırsınız.
          </p>
          <p>
            <strong>Son güncelleme:</strong> 19 Ağustos 2026
          </p>

          <h2 className={h2}>1. Hizmet Tanımı</h2>
          <p>
            Zihin Turu, matematik ve mantık becerileri geliştirmeye yönelik ücretsiz
            bir zihin oyunudur. Günlük bulmacalar ve antrenman modları sunar.
            Reklam içermez ve herhangi bir ücret talep etmez.
          </p>

          <h2 className={h2}>2. Hesap Oluşturma</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hesap oluşturmak için geçerli bir e-posta adresi gereklidir</li>
            <li>Her e-posta adresiyle yalnızca bir hesap oluşturulabilir</li>
            <li>Hesapsız (misafir) oynamak mümkündür; bu durumda puanlar kaydedilmez</li>
          </ul>

          <h2 className={h2}>3. Kullanıcı Adı Kuralları</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kullanıcı adı sıralama tablosunda herkese açık görünür</li>
            <li>Hakaret, küfür, tehdit veya uygunsuz içerik barındıran kullanıcı adları kaldırılabilir</li>
            <li>Başka kişileri taklit eden kullanıcı adları yasaktır</li>
          </ul>

          <h2 className={h2}>4. Kabul Edilemez Davranışlar</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sahte veya toplu hesap oluşturma</li>
            <li>Otomatik araçlarla (bot) oyun oynama veya puan manipülasyonu</li>
            <li>Sistemin güvenliğini veya işleyişini bozmaya çalışma</li>
            <li>Başka kullanıcıların hesaplarına yetkisiz erişim</li>
          </ul>
          <p>
            Bu kuralları ihlal eden hesaplar uyarı yapılmadan kapatılabilir.
          </p>

          <h2 className={h2}>5. Fikri Mülkiyet</h2>
          <p>
            Zihin Turu'nun tasarımı, kodu, logosu ve içeriği proje sahibine aittir.
            Kullanıcılar uygulamayı yalnızca kişisel kullanım amacıyla kullanabilir.
          </p>

          <h2 className={h2}>6. Hizmet Sürekliliği</h2>
          <p>
            Hizmet "olduğu gibi" sunulmaktadır. Kesintisiz veya hatasız çalışacağı
            garanti edilmez. Bakım, güncelleme veya teknik sorunlar nedeniyle
            hizmet geçici olarak durabilir.
          </p>

          <h2 className={h2}>7. Sorumluluk Sınırı</h2>
          <p>
            Zihin Turu, veri kaybı, hizmet kesintisi veya uygulamanın
            kullanımından doğabilecek dolaylı zararlardan sorumlu tutulamaz.
          </p>

          <h2 className={h2}>8. Yaş Sınırı</h2>
          <p>
            Uygulama 13 yaş ve üzeri kullanıcılara yöneliktir. 18 yaş altındaki
            kullanıcıların velisinin bilgisi dahilinde kullanması önerilir.
          </p>

          <h2 className={h2}>9. Hesap Silme</h2>
          <p>
            Hesabınızı istediğiniz zaman menüdeki "Hesabımı sil" seçeneğinden
            silebilirsiniz. Silme işlemi geri alınamaz; tüm verileriniz 30 gün
            içinde kalıcı olarak kaldırılır.
          </p>

          <h2 className={h2}>10. Değişiklikler</h2>
          <p>
            Bu koşullar güncellenebilir. Önemli değişiklikler uygulama içinde
            duyurulacaktır. Güncelleme sonrası uygulamayı kullanmaya devam etmeniz,
            yeni koşulları kabul ettiğiniz anlamına gelir.
          </p>

          <h2 className={h2}>11. Uygulanacak Hukuk</h2>
          <p>
            Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda
            İstanbul mahkemeleri ve icra daireleri yetkilidir.
          </p>

          <h2 className={h2}>12. İletişim</h2>
          <p>
            Sorularınız için: <strong>izzet@haciserif.com</strong>
          </p>
        </div>
      }
    />
  );
}

/* ========================================================================== */
/*  HESAP SİLME                                                                */
/* ========================================================================== */
export function HesapSilSayfasi({ onGeri }: { onGeri?: () => void }) {
  const [onayli, setOnayli] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function sil() {
    setYukleniyor(true);
    try {
      const sonuc = await hesapSil();
      if (!sonuc.basarili) {
        setHata(sonuc.hata ?? 'Silme başarısız oldu.');
      } else {
        window.location.href = '/';
      }
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <SayfaSablonu
      baslik="Hesabımı Sil"
      alt="Bu işlem geri alınamaz"
      onGeri={onGeri}
      cocuklar={
        <div className={icerik}>
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-200 text-xs">
            ⚠️ <strong>Geri alınamaz:</strong> Hesabınızı sildiğinizde tüm verileriniz
            kalıcı olarak kaldırılır ve bu işlem geri alınamaz.
          </div>

          <h2 className={h2}>Silinecek Veriler</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hesap bilgileri (e-posta, kullanıcı adı)</li>
            <li>Tüm oyun puanları ve tur sonuçları</li>
            <li>Lig sıralaması ve haftalık veriler</li>
            <li>XP, seri ve rozet bilgileri</li>
          </ul>

          <h2 className={h2}>KVKK Hakkınız</h2>
          <p>
            Hesap silme, KVKK madde 7'de tanınan "kişisel verilerin silinmesi"
            hakkınızdır. Verileriniz silme talebinden sonra 30 gün içinde
            kalıcı olarak yok edilir.
          </p>

          <div className="mt-6 p-4 rounded-lg border border-slate-700 bg-slate-900/40">
            {hata && (
              <p className="mb-4 text-sm text-red-400">{hata}</p>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={onayli}
                onChange={(e) => setOnayli(e.target.checked)}
                disabled={yukleniyor}
                className="mt-1 accent-red-500"
              />
              <span className="text-xs text-slate-300">
                Hesabımı ve tüm verilerimi kalıcı olarak silmek istiyorum.
                Bu işlemin geri alınamayacağını anlıyorum.
              </span>
            </label>

            <button
              onClick={sil}
              disabled={!onayli || yukleniyor}
              className={`mt-4 w-full py-3 rounded-lg font-bold transition ${
                onayli && !yukleniyor
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {yukleniyor ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
            </button>
          </div>
        </div>
      }
    />
  );
}
