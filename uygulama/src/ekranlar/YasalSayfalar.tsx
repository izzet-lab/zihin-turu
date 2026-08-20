/**
 * YasalSayfalar.tsx — KVKK, gizlilik, çerez, kullanım koşulları, hesap silme
 *
 * Zihin Turu projesinin gerçek durumunu yansıtan yasal metinler.
 * 19 Ağustos 2026'da avukat incelemesinden geçmiştir; metinler
 * değiştirilirse yeniden hukuki onay alınmalıdır.
 *
 * Hedef kitle 8 yaş ve üzeridir — çocuk kullanıcılara ilişkin
 * ifadeler bu yaşa göre yazılmıştır.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hesapSil } from '../kimlik';
import SayfaSablonu from './SayfaSablonu';

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
            girişimcidir. İletişim: <strong>sefa162354@gmail.com</strong>
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
              <tr><td className="px-3 py-2">Bildirim jetonu <span className="text-slate-500">(Android)</span></td><td className="px-3 py-2">Günlük hatırlatma bildirimi göndermek — Firebase Cloud Messaging</td><td className="px-3 py-2">Hayır, izin sorulur</td></tr>
              <tr><td className="px-3 py-2">Çökme kayıtları <span className="text-slate-500">(Android)</span></td><td className="px-3 py-2">Uygulama çöktüğünde hata izi, cihaz modeli, Android sürümü — Firebase Crashlytics</td><td className="px-3 py-2">Kapatılabilir</td></tr>
              <tr><td className="px-3 py-2">Kullanım olayları <span className="text-slate-500">(Android)</span></td><td className="px-3 py-2">Hangi ekran açıldı, tur bitti mi gibi oyun olayları — Firebase Analytics</td><td className="px-3 py-2">Kapatılabilir</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500">
            Telefon numarası, adres, TC kimlik numarası gibi veriler <strong>toplanmaz</strong>.
            Son üç satır yalnızca <strong>Android uygulamasında</strong> geçerlidir; tarayıcıdan
            oynayanlarda bu veriler hiç toplanmaz.
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
            <strong>Android uygulamasında</strong> ayrıca <strong>Google</strong>'ın
            şu hizmetleri kullanılır: Firebase (bildirim, çökme raporu, kullanım
            olayları, uzak ayar) ve Google AdMob (reklam). Bu hizmetler Google'ın
            gizlilik politikasına tabidir ve verileri Google altyapısında işlenir.
          </p>
          <p>
            Verileriniz — e-posta adresiniz ve kullanıcı adınız dâhil —{' '}
            <strong>reklam veya pazarlama amacıyla hiçbir üçüncü tarafla
            paylaşılmaz</strong>. Reklam ağına kimliğinizi belirleyen hiçbir bilgi
            gönderilmez.
          </p>

          <h2 className={h2}>6. Reklamlar</h2>
          <p>
            Android uygulamasında Google AdMob aracılığıyla reklam gösterilir.
            Tarayıcı sürümünde reklam yoktur.
          </p>
          <p>
            Zihin Turu çocuklara yönelik bir uygulama olduğu için reklamlar
            <strong> kişiselleştirilmez</strong>. Teknik olarak şu ayarlar
            uygulanmıştır:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Reklamlar "çocuğa yönelik" ve "rıza yaşının altında" olarak etiketlenir</li>
            <li>Yalnızca <strong>genel izleyici (G)</strong> derecesindeki reklamlar gösterilir</li>
            <li>Reklam kimliği (AAID) <strong>toplanmaz</strong>; uygulama bu izni açıkça kaldırır</li>
            <li>Davranışsal profil çıkarılmaz; reklamlar ilgi alanınıza göre seçilmez</li>
            <li>Oyun sırasında tam ekran reklam gösterilmez; yalnızca alt banner kullanılır</li>
          </ul>

          <h2 className={h2}>7. Saklama Süresi</h2>
          <p>
            Kişisel verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı
            sildiğinizde tüm verileriniz <strong>30 gün içinde</strong> kalıcı olarak
            silinir. Yasal yükümlülükler gerektirdiğinde bu süre uzayabilir.
          </p>

          <h2 className={h2}>8. Haklarınız (KVKK Madde 11)</h2>
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
            kullanabilir veya <strong>sefa162354@gmail.com</strong> adresine yazabilirsiniz.
          </p>

          <h2 className={h2}>9. Başvuru ve Şikâyet</h2>
          <p>
            Haklarınızı kullanmak için <strong>sefa162354@gmail.com</strong> adresine
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
            Ayrıntılı liste için <Link to="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma Metni</Link>'ne
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

          <h2 className={h2}>3. Üçüncü Taraf Hizmetleri</h2>
          <p>
            <strong>Tarayıcı sürümünde</strong> veriler yalnızca hizmetin sunulması
            için gerekli altyapı sağlayıcılarında (Supabase, Cloudflare) işlenir.
            Reklam, analitik veya izleme hizmeti kullanılmaz.
          </p>
          <p>
            <strong>Android uygulamasında</strong> ek olarak Google hizmetleri
            kullanılır:
          </p>
          <table className="w-full text-xs border border-slate-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Hizmet</th>
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Ne için</th>
                <th className="text-left px-3 py-2 text-slate-400 font-bold">Kapatılabilir mi?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr><td className="px-3 py-2">Firebase Cloud Messaging</td><td className="px-3 py-2">Günlük hatırlatma bildirimi</td><td className="px-3 py-2">Evet, izin sorulur</td></tr>
              <tr><td className="px-3 py-2">Firebase Crashlytics</td><td className="px-3 py-2">Çökme raporları</td><td className="px-3 py-2">Evet</td></tr>
              <tr><td className="px-3 py-2">Firebase Analytics</td><td className="px-3 py-2">Kullanım olayları</td><td className="px-3 py-2">Evet</td></tr>
              <tr><td className="px-3 py-2">Firebase Remote Config</td><td className="px-3 py-2">Oyun ayarlarını güncelleme</td><td className="px-3 py-2">Hayır (veri toplamaz)</td></tr>
              <tr><td className="px-3 py-2">Google AdMob</td><td className="px-3 py-2">Reklam gösterimi</td><td className="px-3 py-2">Hayır</td></tr>
            </tbody>
          </table>
          <p>
            Bu hizmetlerin hiçbirine <strong>e-posta adresiniz, kullanıcı adınız veya
            oyuncu kimliğiniz gönderilmez</strong>. Analytics'e yalnızca oyun olayları
            (hangi ekran, hangi seviye) iletilir; kim olduğunuzu belirten bir bilgi
            eklenmez.
          </p>
          <p>
            Bu ayarları uygulamadaki <strong>Gizlilik ayarları</strong> bölümünden
            değiştirebilirsiniz.
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
            Zihin Turu <strong>8 yaş ve üzeri</strong> kullanıcılara yöneliktir.
            18 yaş altındaki kullanıcıların hesap açması için velisinin izni gerekir;
            veli, çocuğun uygulamayı kullanımından sorumludur.
          </p>
          <p>
            Çocuk kullanıcılardan yalnızca hizmetin çalışması için gereken en az veri
            toplanır: e-posta, kullanıcı adı ve oyun sonuçları. Veriler pazarlama
            amacıyla kullanılmaz ve satılmaz.
          </p>
          <p>
            Android uygulamasında reklam gösterilir; ancak uygulama çocuklara yönelik
            olduğu için reklamlar <strong>kişiselleştirilmez</strong>. Reklam kimliği
            (AAID) toplanmaz, davranışsal profil çıkarılmaz ve yalnızca genel izleyici
            derecesindeki reklamlar gösterilir. Ayrıntı için{' '}
            <Link to="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma
            Metni</Link>'nin "Reklamlar" bölümüne bakınız.
          </p>
          <p>
            Velisi, çocuğuna ait hesabın silinmesini <strong>sefa162354@gmail.com</strong>
            adresine yazarak isteyebilir.
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
            Gizlilik ile ilgili sorularınız için: <strong>sefa162354@gmail.com</strong>
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
          <p>
            Bu politika, Zihin Turu uygulamasının çerez ve yerel depolama
            kullanımını açıklar.
          </p>
          <p>
            <strong>Son güncelleme:</strong> 19 Ağustos 2026
          </p>

          <h2 className={h2}>1. Çerez Kullanımı</h2>
          <p>
            <strong>Tarayıcı sürümünde</strong> reklam veya analitik amaçlı çerez
            <strong> kullanılmaz</strong>.
          </p>
          <p>
            <strong>Android uygulamasında</strong> çerez kullanılmaz; ancak Google
            Firebase ve AdMob kendi tanımlayıcılarını kullanır. Uygulama çocuklara
            yönelik olduğu için reklam kimliği (AAID) toplanmaz ve reklamlar
            kişiselleştirilmez.
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
            <strong>Tarayıcı sürümünde</strong> reklam, analitik veya izleme amaçlı
            üçüncü taraf betiği <strong>yüklenmez</strong>. Google Analytics, Facebook
            Pixel veya benzeri izleme araçları yoktur.
          </p>
          <p>
            Firebase ve AdMob yalnızca <strong>Android uygulamasında</strong> çalışır;
            tarayıcıya bu kütüphaneler hiç indirilmez.
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
            Herhangi bir ücret talep etmez.
          </p>
          <p>
            <strong>Android uygulamasında reklam gösterilir</strong>; tarayıcı
            sürümünde reklam yoktur. Uygulama çocuklara yönelik olduğu için
            reklamlar kişiselleştirilmez ve oyun sırasında tam ekran reklam
            gösterilmez. Ayrıntı için{' '}
            <Link to="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma
            Metni</Link>'ne bakınız.
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
            Uygulama <strong>8 yaş ve üzeri</strong> kullanıcılara yöneliktir.
            18 yaş altındaki kullanıcılar hesap açmak için velisinin iznini almalıdır.
            Veli, çocuğun uygulamayı kullanımından sorumludur ve dilediği zaman
            hesabın silinmesini talep edebilir.
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
            Sorularınız için: <strong>sefa162354@gmail.com</strong>
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
