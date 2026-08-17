/**
 * YasalSayfalar.tsx — KVKK, gizlilik, çerez, kullanım koşulları, hesap silme
 *
 * UYARI — Avukat incelemesinden geçmeden yayına alınmamalıdır.
 * Bu metinler örnek/şablon amaçlıdır. Gerçek hayatta:
 * - Hukuk müşaviri / avukatla incelenir
 * - Yasal ve teknik doğruluk sağlanır
 * - Türk ve uluslararası veri koruma kanunlarına uygun yapılır
 * - Oluşturulduktan sonra güncelleme süreci belirlenmelidir
 *
 * Mevcut metinler:
 * - KVKK Aydınlatma Metni (zorunlu)
 * - Gizlilik Politikası
 * - Çerez Politikası
 * - Kullanım Koşulları
 * - Hesap Silme (UI'den çağrılır)
 */

import { useState } from 'react';
import { hesapSil } from '../kimlik';
import SayfaSablonu from './SayfaSablonu';

export function KVKKSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="KVKK Aydınlatma Metni"
      alt="Kişisel verilerin işlenmesi hakkında"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-amber-200 text-xs">
            ⚠️ <strong>Avukat İncelemesinden Geçmedi:</strong> Bu metin örnek amaçlıdır.
            Herkese açık yayından önce yasal danışmanla gözden geçirilmelidir.
          </div>

          <h2 className="text-base font-bold text-white mt-6">Denetim Kurulu Sorumluluğu</h2>
          <p>
            [Proje Sahibi Adı], Kişisel Verileri Koruma Kanunu (KVKK, 6698 sayılı) uyarınca
            veri sorumlusu olarak, aşağıda açıklanan kişisel verilerin işlenmesi konusunda sizi
            bilgilendirmek ve açık rıza almak için bu metni hazırlamıştır.
          </p>

          <h2 className="text-base font-bold text-white">Hangi Veriler Toplanır?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Hesap verisi:</strong> Telefon numarası (giriş için), şifre (hash'lenmiş), kullanıcı adı</li>
            <li><strong>Oyun verisi:</strong> Oyun puanları, oynanan seviyeler, tarihler, süreler</li>
            <li><strong>Opsiyonel veli verisi:</strong> Velinin telefon numarası, adı, ilişki tipi</li>
            <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgileri, cihaz tipi</li>
          </ul>

          <h2 className="text-base font-bold text-white">Veriler Neden Toplanır?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Hesap doğrulaması ve güvenlik</li>
            <li>Oyun ilerlemenizi takip etmek ve kaydetmek</li>
            <li>Sıralamalar ve istatistikler göstermek</li>
            <li>Veli takibi (opsiyonel, sadece veli hesabıysa)</li>
            <li>Hizmetin iyileştirilmesi için analiz</li>
          </ul>

          <h2 className="text-base font-bold text-white">Veriler Kiminle Paylaşılır?</h2>
          <p>
            Kişisel verileriniz <strong>yalnızca sizinle</strong> ve (opsiyonel olarak) belirttiğiniz velilerle
            paylaşılır. Reklamcılarla, analitik şirketleriyle veya üçüncü taraflarla paylaşılmaz.
          </p>
          <p>
            Veri barındırması: Supabase (İsviçre'de barındırılan PostgreSQL — AWS eu-central-1).
          </p>

          <h2 className="text-base font-bold text-white">Veriler Ne Kadar Saklanır?</h2>
          <p>
            Oyun verileri: Hesabınızı silene kadar. Hesabı sildikten sonra 30 gün içinde silinir
            (kanuni yükümlülük nedeniyle kısa bir süre tutulabilir).
          </p>
          <p>
            Veli verileri: Veli ilişkisini sonlandırırsanız 30 gün içinde silinir.
          </p>

          <h2 className="text-base font-bold text-white">Haklar</h2>
          <p>
            KVKK uyarınca şu haklar vardır:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Verilerinize erişim talep etme</li>
            <li>Verilerinizi düzeltme</li>
            <li>Verilerinizi silme (sağ panelden "Hesapı Sil")</li>
            <li>İşlemeyi durdurma</li>
            <li>Şikayet: Kişisel Verileri Koruma Kurumu (KVKK)</li>
          </ul>

          <h2 className="text-base font-bold text-white">İletişim</h2>
          <p>
            Sorularınız için: {'{proje.sahibi.eposta}'}
          </p>

          <div className="border-t border-slate-700 pt-4 mt-6 text-xs text-slate-500">
            <p>
              <strong>Not:</strong> Reşit olmayan kullanıcılar (18 yaş altı) için veli açık rızası gereklidir.
            </p>
          </div>
        </div>
      }
    />
  );
}

export function GizlilikSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Gizlilik Politikası"
      alt="Verileriniz nasıl korunur"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-amber-200 text-xs">
            ⚠️ <strong>Avukat İncelemesinden Geçmedi:</strong> Herkese açık yayından önce yasal danışmanla gözden geçirilmelidir.
          </div>

          <h2 className="text-base font-bold text-white">Barındırma ve Güvenlik</h2>
          <p>
            Veriler PostgreSQL veritabanında Supabase üzerinde barındırılır (AWS eu-central-1).
            Bağlantı HTTPS ve SSL/TLS şifreleme ile korunur.
          </p>

          <h2 className="text-base font-bold text-white">Şifreler</h2>
          <p>
            Şifreleriniz düz metin olarak saklanmaz; bcrypt ile hash'lenmiş haldedir.
          </p>

          <h2 className="text-base font-bold text-white">Analitik</h2>
          <p>
            Oyun performansını iyileştirmek için anonimleştirilmiş veriler toplanabilir
            (örn: ortalama bitmek süresi). Kişi bazlı izleme yapılmaz.
          </p>

          <h2 className="text-base font-bold text-white">Çerezler ve Yerel Depolama</h2>
          <p>
            İlerleme verisi tarayıcının yerel depolamasında (localStorage) saklanır.
            Analitik çerezler kullanılmaz.
          </p>

          <h2 className="text-base font-bold text-white">Veri İhlali Bildirim</h2>
          <p>
            Eğer bir veri ihlali tespit edilirse, yasal süre içinde (KVKK uyarınca)
            size ve KVKK Kurulu'na bildirim yapılacaktır.
          </p>
        </div>
      }
    />
  );
}

export function CerezSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Çerez Politikası"
      alt="İzleme teknolojileri hakkında"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-amber-200 text-xs">
            ⚠️ <strong>Avukat İncelemesinden Geçmedi:</strong> Herkese açık yayından önce yasal danışmanla gözden geçirilmelidir.
          </div>

          <h2 className="text-base font-bold text-white">Çerez Kullanımı</h2>
          <p>
            Bu uygulama <strong>tanımlama amaçlı çerez kullanmaz</strong>.
          </p>
          <p>
            Supabase oturumu yerel depolamada saklanır ve tarayıcı kapatılınca silinir (teknik çerez).
          </p>

          <h2 className="text-base font-bold text-white">Üçüncü Taraf Betikleri</h2>
          <p>
            Reklamcılık, analytics veya takip amaçlı üçüncü taraf betikleri kullanılmaz.
          </p>

          <h2 className="text-base font-bold text-white">Yerel Depolama (localStorage)</h2>
          <p>
            Oyun ilerlemeniz tarayıcıda saklanır. Bu veriler:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sadece kendi tarayıcınızda okunabilir</li>
            <li>Başka sitelerle paylaşılmaz</li>
            <li>Tarayıcıyı temizlerseniz silinir</li>
          </ul>
        </div>
      }
    />
  );
}

export function KullanimKosullariSayfasi({ onGeri }: { onGeri?: () => void }) {
  return (
    <SayfaSablonu
      baslik="Kullanım Koşulları"
      alt="Hizmet şartları"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-4 text-amber-200 text-xs">
            ⚠️ <strong>Avukat İncelemesinden Geçmedi:</strong> Herkese açık yayından önce yasal danışmanla gözden geçirilmelidir.
          </div>

          <h2 className="text-base font-bold text-white">Hizmet Tanımı</h2>
          <p>
            Bu uygulama, öğrencilerin sınav hazırlığı kapsamında günlük çalışmalarını takip
            etmeleri için tasarlanmıştır. Ücretsiz ve reklamsızdır.
          </p>

          <h2 className="text-base font-bold text-white">Sorumlu Kullanım</h2>
          <p>
            Kullanıcılar aşağıdakilerden kaçınmalıdır:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sahte hesap oluşturma</li>
            <li>Başka hesapları hackleme veya kullananı taklit etme</li>
            <li>Sistemi bozmak amacıyla otomasyon veya spam</li>
            <li>Uygunsuz davranış veya tehditler</li>
          </ul>

          <h2 className="text-base font-bold text-white">Reşit Olmayan Kullanıcılar</h2>
          <p>
            18 yaş altında olan kullanıcılar velisinin rızasıyla giriş yapabilir.
            Veli, çocuğunun kullanımından sorumludur.
          </p>

          <h2 className="text-base font-bold text-white">Sorumluluk Sınırı</h2>
          <p>
            Bu uygulama "olduğu gibi" sunulur. Veri kaybı, hizmet kesintileri veya
            dolaylı zararlardan dolayı sorumluluk kabul edilmez.
          </p>

          <h2 className="text-base font-bold text-white">Hizmeti Kullanma Hakkı Kaybetme</h2>
          <p>
            Yapılan kurallar ihlal edilirse hesap kapatılabilir.
          </p>

          <h2 className="text-base font-bold text-white">Değişiklikler</h2>
          <p>
            Bu şartlar ve özellikler uyarı vermeden değiştirilebilir.
            Önemli değişiklikler uygulamada duyurulacaktır.
          </p>
        </div>
      }
    />
  );
}

export function HesapSilSayfasi({ onGeri, onSil }: { onGeri?: () => void; onSil?: () => void }) {
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
        // Hesap silindi; ana sayfaya yönlendir
        window.location.href = '/';
      }
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <SayfaSablonu
      baslik="Hesapı Sil"
      alt="Permanent olarak kaldırılacaktır"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300">
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-200 text-xs">
            ⚠️ <strong>Geri alınamaz:</strong> Hesabınızı sildikten sonra tüm verileriniz silinir
            ve geri getirilemez.
          </div>

          <h2 className="text-base font-bold text-white">Neler Silinir?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Hesap bilgileri (telefon, şifre, kullanıcı adı)</li>
            <li>Tüm oyun puanları ve ilerleme</li>
            <li>Sıralama geçmişi</li>
            <li>Veli ilişkileri (varsa)</li>
          </ul>

          <h2 className="text-base font-bold text-white">Ne Kalmaz?</h2>
          <p>
            Genel sıralamada (başkaları tarafından görülen listede) isminiz zaten görünmediğinden,
            sadece hesap kaydı silinir.
          </p>

          <h2 className="text-base font-bold text-white">KVKK Hakkınız</h2>
          <p>
            Verilerin silinmesi KVKK'nın 17. maddesinde tanınan "Silinme Hakkı"dır.
            30 gün içinde kalıcı olarak silinecektir.
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
                className="mt-1"
              />
              <span className="text-xs text-slate-300">
                Hesabımı kalıcı olarak silmek istiyorum. Bu işlemin geri alınamayacağını anlıyorum.
              </span>
            </label>

            <button
              onClick={onSil ? onSil : sil}
              disabled={!onayli || yukleniyor}
              className={`mt-4 w-full py-3 rounded-lg font-bold transition ${
                onayli && !yukleniyor
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {yukleniyor ? 'Siliniyor…' : 'Hesabı Sil'}
            </button>
          </div>
        </div>
      }
    />
  );
}
