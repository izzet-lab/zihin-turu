/**
 * Giriş / Kayıt ekranı — e-posta + parola ve Google.
 *
 * Misafir oynamak isteyen "Şimdi değil" ile geçer; üyelik zorunlu değil.
 *
 * NEDEN PAROLA, NEDEN SİHİRLİ BAĞLANTI DEĞİL (20 Ekim 2026)
 * Önceden e-postanın tek yolu sihirli bağlantıydı: adrese bir giriş
 * bağlantısı gönderiliyordu. Altyapı kendi sunucumuza taşındıktan sonra
 * giden posta servisi kalmadı, yani o bağlantı hiç gönderilmiyor. Ekran
 * "Bağlantı gönderildi" diyor, oyuncu bekliyor, posta gelmiyor — hata
 * mesajı da çıkmadığı için anlaşılması çok zor. Parola bu zinciri
 * tamamen postadan kurtarıyor.
 *
 * BUNUN BİLİNEN EKSİĞİ: "parolamı unuttum" akışı yok, çünkü o da posta
 * gerektiriyor. Posta servisi tanımlanınca ya da Google girişi açılınca
 * eklenecek (bkz. CLAUDE.md bekleyen işler).
 *
 * YAŞ SINIRI (kural 6)
 * - Doğum yılı YALNIZCA yeni hesap açarken sorulur (tam tarih değil,
 *   yıl — veri minimizasyonu). Girişte sorulmaz: hesap açılırken bir kez
 *   doğrulandı, her girişte tekrar sormak gereksiz sürtünme.
 * - 13 altı → kayıt yapılamaz, nazik mesajla açıklanır, misafir oynayabilir
 * - 13–17 → veli onayı beyanı istenir
 * - 18+ → doğrudan devam
 * - 18 altına kişiselleştirilmiş reklam gösterilmez (reklam.ts'de)
 */

import { useState } from 'react';
import Ikon from '../bilesenler/Ikon';
import Logo from '../bilesenler/Logo';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { girisDonusAdresi, nativeMi } from '../platform';
import { Browser } from '@capacitor/browser';
import { dogumYiliYaz, veliOnayiYaz } from '../depo';

interface Props {
  /** Kullanıcı "Şimdi değil" seçtiğinde çağrılır. */
  onAtla: () => void;
}

/** Ekranın iki kipi: var olan hesaba giriş, ya da yeni hesap. */
type Kip = 'giris' | 'kayit';

/** Parolanın en az uzunluğu. Sunucu altıyı yeterli sayıyor; sekiz daha güvenli. */
const PAROLA_EN_AZ = 8;

/** Şu anki yıla göre yaklaşık yaş. */
function yasHesapla(dogumYili: number): number {
  return new Date().getFullYear() - dogumYili;
}

/**
 * Sunucudan gelen İngilizce hata metnini oyuncunun anlayacağı Türkçeye
 * çevirir. Eşleşmeyen bir hata olduğu gibi gösterilir — sessizce yutmak,
 * oyuncuyu "neden olmuyor?" diye bırakmaktan iyidir.
 */
function hataMetni(mesaj: string): string {
  const m = mesaj.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-posta veya parola hatalı.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Bu e-posta zaten kayıtlı. Giriş yap kipini dene.';
  }
  if (m.includes('password should be at least')) {
    return 'Parola en az ' + PAROLA_EN_AZ + ' karakter olmalı.';
  }
  if (m.includes('invalid') && m.includes('email')) return 'Geçerli bir e-posta adresi gir.';
  if (m.includes('email not confirmed')) return 'Hesap henüz onaylanmamış.';
  return mesaj;
}

export default function Giris({ onAtla }: Props) {
  const [kip, setKip] = useState<Kip>('giris');
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [parolaGorunur, setParolaGorunur] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kosullarKabul, setKosullarKabul] = useState(false);

  // Yaş sınırı alanları — yalnızca yeni hesap açarken kullanılıyor
  const [dogumYili, setDogumYili] = useState<string>('');
  const [veliOnayi, setVeliOnayi] = useState(false);
  const [yasEngeli, setYasEngeli] = useState(false);

  const yil = dogumYili ? parseInt(dogumYili, 10) : null;
  const yas = yil ? yasHesapla(yil) : null;
  const kucuk = yas != null && yas < 13;
  const veliOnayiGerekli = yas != null && yas >= 13 && yas < 18;

  /** Yeni hesap mı açılıyor? Yaş ve koşullar yalnızca o zaman gerekli. */
  const yeniHesap = kip === 'kayit';

  /** Yaş + onay doğrulaması. Geçerliyse true döner. */
  function yasDogrula(): boolean {
    if (!yil || isNaN(yil)) {
      setHata('Doğum yılını gir.');
      return false;
    }
    if (yil < 1930 || yil > new Date().getFullYear()) {
      setHata('Geçerli bir doğum yılı gir.');
      return false;
    }
    if (kucuk) {
      setYasEngeli(true);
      return false;
    }
    if (veliOnayiGerekli && !veliOnayi) {
      setHata('Devam etmek için velinin onayı gerekiyor.');
      return false;
    }
    return true;
  }

  /** Yaş ve onay bilgisini kaydeder. */
  function yasBilgisiKaydet() {
    if (yil) dogumYiliYaz(yil);
    if (veliOnayiGerekli) veliOnayiYaz(veliOnayi);
  }

  /**
   * Yeni hesap açarken gereken ortak kontroller: koşullar ve yaş.
   * Google da ilk kullanımda hesap açtığı için aynı kapıdan geçiyor.
   */
  function yeniHesapKapisi(): boolean {
    if (!kosullarKabul) {
      setHata('Devam etmek için koşulları kabul etmelisin.');
      return false;
    }
    return yasDogrula();
  }

  /** E-posta ve parola alanlarının biçim kontrolü. */
  function alanlariDogrula(): string | null {
    if (!eposta.trim().includes('@')) return 'Geçerli bir e-posta adresi gir.';
    if (parola.length < PAROLA_EN_AZ) return 'Parola en az ' + PAROLA_EN_AZ + ' karakter olmalı.';
    return null;
  }

  async function epostaIleDevam() {
    const bicimHatasi = alanlariDogrula();
    if (bicimHatasi) {
      setHata(bicimHatasi);
      return;
    }
    if (yeniHesap && !yeniHesapKapisi()) return;

    setHata(null);
    setYukleniyor(true);
    try {
      const temiz = eposta.trim().toLowerCase();
      if (yeniHesap) {
        yasBilgisiKaydet();
        const { data, error } = await supabase.auth.signUp({ email: temiz, password: parola });
        if (error) {
          setHata(hataMetni(error.message));
          return;
        }
        // Oturum gelmezse hesap onay bekliyor demektir; sessiz kalmayalım.
        if (!data.session) {
          setHata('Hesap açıldı ama oturum açılamadı. Giriş yap kipiyle dene.');
          setKip('giris');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: temiz, password: parola });
        if (error) setHata(hataMetni(error.message));
      }
    } finally {
      setYukleniyor(false);
    }
  }

  async function googleIleGiris() {
    // Google ilk kullanımda hesap açıyor; yaş ve koşullar kapısı burada da geçerli.
    if (!yeniHesapKapisi()) return;
    setHata(null);
    yasBilgisiKaydet();
    /*
     * ANDROID'DE GOOGLE SAYFASI SİSTEM TARAYICISINDA AÇILIR.
     *
     * Önceden uygulamanın KENDİ web görünümü Google'a gidiyordu.
     * Oyuncu onayı verdikten sonra sunucu `com.tamisabet.app://giris`
     * adresine yönlendiriyor; ama bir web görünümü özel şemaları
     * işletim sistemine devretmiyor. Sonuç: onay veriliyor, uygulamaya
     * dönüş olmuyor, oyuncu bir web sayfasında kalıyor.
     *
     * Doğrusu: adresi sistem tarayıcısında aç, dönüşü derin bağlantı
     * olarak yakala (bkz. derinBaglanti.ts), tarayıcıyı kapat.
     * Google zaten gömülü web görünümünden girişi engelliyor.
     */
    if (nativeMi()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: girisDonusAdresi(), skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        setHata(`Google girişi başlatılamadı: ${error?.message ?? 'adres alınamadı'}`);
        return;
      }
      try {
        await Browser.open({ url: data.url });
      } catch {
        // Tarayıcı açılamazsa son çare: aynı pencerede git.
        window.location.href = data.url;
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: girisDonusAdresi() },
    });
    if (error) setHata(`Google girişi başlatılamadı: ${error.message}`);
  }

  /** Kip değişince hata ve yaş engeli temizlenir. */
  function kipDegistir(yeni: Kip) {
    setKip(yeni);
    setHata(null);
    setYasEngeli(false);
  }

  // 13 yaş altı engeli
  if (yasEngeli) {
    return (
      <main className="min-h-dvh zt-kagit zt-metin flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <Ikon ad="pasta" boyut={52} className="mb-4 zt-metin-soluk" />
          <h1 className="text-xl font-black zt-metin mb-3">Yaşın henüz yetmiyor</h1>
          <p className="zt-metin-soluk text-sm mb-2">
            Üye olmak için en az 13 yaşında olman gerekiyor.
          </p>
          <p className="zt-metin-soluk text-sm mb-8">
            Ama oyunu misafir olarak oynamaya devam edebilirsin — bütün turlar açık.
          </p>
          <button
            onClick={onAtla}
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin"
          >
            Misafir olarak oyna
          </button>
          <button
            onClick={() => { setYasEngeli(false); setDogumYili(''); }}
            className="mt-4 w-full text-center text-sm zt-metin-soluk"
          >
            Doğum yılını düzelt
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh zt-kagit zt-metin flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Başlık */}
        <div className="text-center mb-6">
          {/* PNG logo koyu zemin için çizilmişti; açık temada kâğıdın
              üstünde koyu bir dikdörtgen olarak duruyordu. */}
          <Logo boyut={48} className="zt-vurgu-metin mx-auto mb-3" />
          <h1 className="text-2xl font-black zt-metin">Tam İsabet</h1>
          <p className="mt-2 text-sm zt-metin-soluk">
            Üye olursan puanların kalıcı olur ve lig tablosuna işler.
          </p>
        </div>

        {/* Kip seçimi */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => kipDegistir('giris')}
            className={
              'min-h-[44px] flex-1 rounded-xl text-sm font-bold ' +
              (kip === 'giris' ? 'zt-dugme zt-metin' : 'border zt-cizgi zt-yuzey zt-metin-soluk')
            }
          >
            Giriş yap
          </button>
          <button
            onClick={() => kipDegistir('kayit')}
            className={
              'min-h-[44px] flex-1 rounded-xl text-sm font-bold ' +
              (kip === 'kayit' ? 'zt-dugme zt-metin' : 'border zt-cizgi zt-yuzey zt-metin-soluk')
            }
          >
            Hesap aç
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Doğum yılı — yalnızca yeni hesapta */}
          {yeniHesap && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">
                Doğum yılı
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={dogumYili}
                onChange={(e) => {
                  setDogumYili(e.target.value);
                  setYasEngeli(false);
                  setHata(null);
                }}
                placeholder="Örn: 2010"
                className="mt-1 w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
              />
              <span className="mt-1 block text-xs zt-metin-soluk">
                Yalnızca yaş doğrulaması için kullanılır.
              </span>
            </label>
          )}

          {/* Veli onayı — 13-17 arası ise göster */}
          {yeniHesap && veliOnayiGerekli && (
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border zt-odul-yuzey p-3">
              <input
                type="checkbox"
                checked={veliOnayi}
                onChange={(e) => {
                  setVeliOnayi(e.target.checked);
                  if (e.target.checked) setHata(null);
                }}
                className="mt-0.5 zt-onay"
              />
              <span className="text-xs zt-metin leading-relaxed">
                <strong className="zt-odul-yazi">Veli onayı:</strong> 18 yaşından küçüğüm.
                Velim bu uygulamayı kullanmama izin veriyor ve{' '}
                <Link to="/yasal/kvkk" className="zt-vurgu-metin underline">KVKK Aydınlatma Metni</Link>'ni
                okumuştur.
              </span>
            </label>
          )}

          {/* E-posta */}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">
              E-posta
            </span>
            <input
              type="email"
              autoComplete="email"
              value={eposta}
              onChange={(e) => { setEposta(e.target.value); setHata(null); }}
              placeholder="ornek@mail.com"
              className="mt-1 w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
            />
          </label>

          {/* Parola */}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">
              Parola
            </span>
            <div className="mt-1 flex items-stretch gap-2">
              <input
                type={parolaGorunur ? 'text' : 'password'}
                autoComplete={yeniHesap ? 'new-password' : 'current-password'}
                value={parola}
                onChange={(e) => { setParola(e.target.value); setHata(null); }}
                onKeyDown={(e) => e.key === 'Enter' && epostaIleDevam()}
                placeholder={yeniHesap ? 'En az ' + PAROLA_EN_AZ + ' karakter' : 'Parolan'}
                className="min-w-0 flex-1 rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
              />
              <button
                type="button"
                onClick={() => setParolaGorunur((v) => !v)}
                aria-label={parolaGorunur ? 'Parolayı gizle' : 'Parolayı göster'}
                className="min-h-[52px] min-w-[52px] rounded-xl border zt-cizgi zt-yuzey text-xs font-bold zt-metin-soluk"
              >
                {parolaGorunur ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </label>

          {hata && <p className="text-sm zt-sure-metin">{hata}</p>}

          <button
            onClick={epostaIleDevam}
            disabled={yukleniyor}
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin disabled:opacity-50"
          >
            {yukleniyor
              ? (yeniHesap ? 'Hesap açılıyor…' : 'Giriş yapılıyor…')
              : (yeniHesap ? 'Hesap aç' : 'Giriş yap')}
          </button>
        </div>

        {/* Ayraç */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 zt-ayirac" />
          <span className="text-xs zt-metin-soluk">veya</span>
          <div className="h-px flex-1 zt-ayirac" />
        </div>

        {/* Google */}
        <button
          onClick={googleIleGiris}
          className="min-h-[52px] w-full rounded-xl border zt-cizgi zt-yuzey text-base font-bold zt-metin flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Google ile {yeniHesap ? 'hesap aç' : 'giriş yap'}
        </button>

        {/* Atla */}
        <button
          onClick={onAtla}
          className="mt-6 w-full text-center text-sm zt-metin-soluk"
        >
          Şimdi değil, oynamaya devam et
        </button>

        {/* Koşullar onayı — yalnızca yeni hesapta; girişte bir kez kabul edilmişti */}
        {yeniHesap && (
          <label className="mt-6 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={kosullarKabul}
              onChange={(e) => {
                setKosullarKabul(e.target.checked);
                if (e.target.checked) setHata(null);
              }}
              className="mt-0.5 zt-onay"
            />
            <span className="text-xs zt-metin-soluk leading-relaxed">
              <Link to="/yasal/kvkk" className="zt-vurgu-metin underline">KVKK Aydınlatma Metni</Link>'ni
              okudum ve{' '}
              <Link to="/yasal/kullanim-kosullari" className="zt-vurgu-metin underline">Kullanım Koşulları</Link>'nı
              kabul ediyorum.
            </span>
          </label>
        )}
      </div>
    </main>
  );
}
