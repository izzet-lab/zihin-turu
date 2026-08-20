/**
 * Giriş / Kayıt ekranı — e-posta (sihirli bağlantı) ve Google.
 *
 * Misafir oynamak isteyen "Şimdi değil" ile geçer; üyelik zorunlu değil.
 *
 * YAŞ SINIRI (A görevi):
 * - Doğum yılı sorulur (tam tarih değil, yıl — veri minimizasyonu)
 * - 13 altı → kayıt yapılamaz, nazik mesajla açıklanır, misafir oynayabilir
 * - 13–17 → veli onayı beyanı istenir
 * - 18+ → doğrudan devam
 * - 18 altına kişiselleştirilmiş reklam gösterilmez (reklam.ts'de)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { girisDonusAdresi } from '../platform';
import { dogumYiliYaz, veliOnayiYaz } from '../depo';

interface Props {
  /** Kullanıcı "Şimdi değil" seçtiğinde çağrılır. */
  onAtla: () => void;
}

/** Şu anki yıla göre yaklaşık yaş. */
function yasHesapla(dogumYili: number): number {
  return new Date().getFullYear() - dogumYili;
}

export default function Giris({ onAtla }: Props) {
  const [eposta, setEposta] = useState('');
  const [gonderildi, setGonderildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kosullarKabul, setKosullarKabul] = useState(false);

  // Yaş sınırı alanları
  const [dogumYili, setDogumYili] = useState<string>('');
  const [veliOnayi, setVeliOnayi] = useState(false);
  const [yasEngeli, setYasEngeli] = useState(false);

  const yil = dogumYili ? parseInt(dogumYili, 10) : null;
  const yas = yil ? yasHesapla(yil) : null;
  const kucuk = yas != null && yas < 13;
  const veliOnayiGerekli = yas != null && yas >= 13 && yas < 18;

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

  async function sihirliGonder() {
    if (!kosullarKabul) {
      setHata('Devam etmek için koşulları kabul etmelisin.');
      return;
    }
    if (!yasDogrula()) return;
    const temiz = eposta.trim().toLowerCase();
    if (!temiz.includes('@')) {
      setHata('Geçerli bir e-posta adresi gir.');
      return;
    }
    setHata(null);
    setYukleniyor(true);
    try {
      yasBilgisiKaydet();
      const { error } = await supabase.auth.signInWithOtp({
        email: temiz,
        options: {
          emailRedirectTo: girisDonusAdresi(),
        },
      });
      if (error) {
        setHata(`Bağlantı gönderilemedi: ${error.message}`);
      } else {
        setGonderildi(true);
      }
    } finally {
      setYukleniyor(false);
    }
  }

  async function googleIleGiris() {
    if (!kosullarKabul) {
      setHata('Devam etmek için koşulları kabul etmelisin.');
      return;
    }
    if (!yasDogrula()) return;
    setHata(null);
    yasBilgisiKaydet();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: girisDonusAdresi() },
    });
    if (error) setHata(`Google girişi başlatılamadı: ${error.message}`);
  }

  // 13 yaş altı engeli
  if (yasEngeli) {
    return (
      <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎂</div>
          <h1 className="text-xl font-black text-white mb-3">Yaşın henüz yetmiyor</h1>
          <p className="text-slate-400 text-sm mb-2">
            Zihin Turu'na üye olmak için en az <strong className="text-slate-200">13 yaşında</strong> olman gerekiyor.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Ama misafir olarak oynamaya devam edebilirsin — hesap açmadan da bulmacaları çözebilirsin.
          </p>
          <button
            onClick={onAtla}
            className="min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
          >
            Misafir olarak oyna
          </button>
          <button
            onClick={() => { setYasEngeli(false); setDogumYili(''); }}
            className="mt-3 w-full text-center text-sm text-slate-600 hover:text-slate-400"
          >
            ← Geri dön
          </button>
        </div>
      </main>
    );
  }

  if (gonderildi) {
    return (
      <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-black text-white mb-2">Bağlantı gönderildi</h1>
          <p className="text-slate-400 mb-1">
            <strong className="text-slate-200">{eposta}</strong> adresine bir giriş bağlantısı gönderdik.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Bağlantıya tıklayınca otomatik giriş yapılır. Spam klasörünü de kontrol et.
          </p>
          <button
            onClick={onAtla}
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            Beklerken oynamaya devam et →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Başlık */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="" className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-2xl font-black text-white">Zihin Turu</h1>
          <p className="mt-2 text-sm text-slate-400">
            Üye olursan puanların kalıcı olur ve lig tablosuna işler.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Doğum yılı */}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
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
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-base text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400"
            />
            <span className="mt-1 block text-xs text-slate-600">
              Yalnızca yaş doğrulaması için kullanılır.
            </span>
          </label>

          {/* Veli onayı — 13-17 arası ise göster */}
          {veliOnayiGerekli && (
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
              <input
                type="checkbox"
                checked={veliOnayi}
                onChange={(e) => {
                  setVeliOnayi(e.target.checked);
                  if (e.target.checked) setHata(null);
                }}
                className="mt-0.5 accent-amber-400"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Veli onayı:</strong> 18 yaşından küçüğüm.
                Velim bu uygulamayı kullanmama izin veriyor ve{' '}
                <Link to="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma Metni</Link>'ni
                okumuştur.
              </span>
            </label>
          )}

          {/* E-posta */}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              E-posta
            </span>
            <input
              type="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sihirliGonder()}
              placeholder="ornek@mail.com"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-base text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400"
            />
          </label>

          {hata && <p className="text-sm text-red-400">{hata}</p>}

          <button
            onClick={sihirliGonder}
            disabled={yukleniyor}
            className="min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200 disabled:opacity-50"
          >
            {yukleniyor ? 'Gönderiliyor…' : 'Sihirli bağlantı gönder'}
          </button>
        </div>

        {/* Ayraç */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-600">veya</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Google */}
        <button
          onClick={googleIleGiris}
          className="min-h-[52px] w-full rounded-xl border border-slate-700 bg-slate-900/60 text-base font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Google ile giriş yap
        </button>

        {/* Atla */}
        <button
          onClick={onAtla}
          className="mt-6 w-full text-center text-sm text-slate-600 hover:text-slate-400"
        >
          Şimdi değil, oynamaya devam et
        </button>

        {/* Koşullar onay */}
        <label className="mt-6 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={kosullarKabul}
            onChange={(e) => {
              setKosullarKabul(e.target.checked);
              if (e.target.checked) setHata(null);
            }}
            className="mt-0.5 accent-cyan-400"
          />
          <span className="text-xs text-slate-400 leading-relaxed">
            <Link to="/yasal/kvkk" className="text-cyan-400 underline">KVKK Aydınlatma Metni</Link>'ni
            okudum ve{' '}
            <Link to="/yasal/kullanim-kosullari" className="text-cyan-400 underline">Kullanım Koşulları</Link>'nı
            kabul ediyorum.
          </span>
        </label>
      </div>
    </main>
  );
}
