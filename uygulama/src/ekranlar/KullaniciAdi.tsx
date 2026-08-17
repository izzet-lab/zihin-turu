/**
 * Kullanıcı adı seçimi — yeni üye için bir kerelik ekran.
 *
 * E-posta veya Google ile ilk kez giriş yapan, henüz oyuncu kaydı
 * olmayan kullanıcı buraya gelir. Bir kullanıcı adı seçilip onaylanınca
 * hem veritabanında oyuncu satırı açılır hem de misafir geçmişi taşınır.
 */

import { useState } from 'react';
import { kullaniciAdiAyarla, kullaniciAdiDogrula, misafirGecmisiniTasi } from '../kimlik';

interface Props {
  oyuncuId: string;
  /** Kullanıcı adı seçilince çağrılır; üst bileşen profili günceller. */
  onTamamlandi: () => void;
}

export default function KullaniciAdi({ oyuncuId, onTamamlandi }: Props) {
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Anlık format kontrolü (veritabanına gitmeden)
  const anlikHata = ad.length > 0 ? kullaniciAdiDogrula(ad.trim().toLowerCase()) : null;

  async function kaydet() {
    const temiz = ad.trim();
    const formatHata = kullaniciAdiDogrula(temiz.toLowerCase());
    if (formatHata) {
      setHata(formatHata);
      return;
    }

    setHata(null);
    setYukleniyor(true);
    try {
      // Önce kullanıcı adını veritabanında oluştur
      const sonuc = await kullaniciAdiAyarla(oyuncuId, temiz);
      if (sonuc) {
        setHata(sonuc);
        return;
      }
      // Sonra misafir geçmişini taşı (sessiz; hata kritik değil)
      await misafirGecmisiniTasi(oyuncuId);
      onTamamlandi();
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏷️</div>
          <h1 className="text-2xl font-black text-white">Kullanıcı adın ne olsun?</h1>
          <p className="mt-2 text-sm text-slate-400">
            Lig tablosunda bu ad görünür. Sonradan değiştirilemez — dikkatli seç.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Kullanıcı adı
          </span>
          <input
            type="text"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && kaydet()}
            placeholder="örn. zihin_ustasi"
            maxLength={16}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-base text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-400"
          />
        </label>

        {/* Anlık format hatası */}
        {anlikHata && (
          <p className="mt-2 text-sm text-amber-400">{anlikHata}</p>
        )}
        {/* Kayıt/benzersizlik hatası */}
        {hata && !anlikHata && (
          <p className="mt-2 text-sm text-red-400">{hata}</p>
        )}

        <p className="mt-2 text-xs text-slate-600">
          3–16 karakter · Harf, rakam, _ ve - kullanılabilir · Türkçe harf tamam
        </p>

        <button
          onClick={kaydet}
          disabled={yukleniyor || !!anlikHata || ad.trim().length < 3}
          className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200 disabled:opacity-40"
        >
          {yukleniyor ? 'Kaydediliyor…' : 'Devam et'}
        </button>

        {/* Misafir geçmişi notu */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
          <strong className="text-slate-400">Geçmişin taşınıyor.</strong>{' '}
          Seriderin, tam isabet sayın ve oyun geçmişin hesabına aktarılır.
          Lig puanların bugünden itibaren birikmeye başlar.
        </div>
      </div>
    </main>
  );
}
