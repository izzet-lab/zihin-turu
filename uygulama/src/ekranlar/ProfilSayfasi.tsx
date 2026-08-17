/**
 * ProfilSayfasi.tsx — Herkese açık profil, /o/kullanici-adi
 * Kullanıcının seviye bazlı en iyi puanları, aktivite göstergesi, istatistikler.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profilIstatistikOku, type ProfilIstatistik } from '../lig-sorgu';

export default function ProfilSayfasi() {
  const { kullaniciAdi } = useParams<{ kullaniciAdi: string }>();
  const [profil, setProfil] = useState<ProfilIstatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    async function yukle() {
      if (!kullaniciAdi) return;
      try {
        const veri = await profilIstatistikOku(kullaniciAdi);
        if (!veri) {
          setHata('Kullanıcı bulunamadı.');
        } else {
          setProfil(veri);
        }
      } catch (e) {
        setHata('Profil yüklenemedi. Lütfen tekrar deneyin.');
        console.error('[ProfilSayfasi]', e);
      } finally {
        setYukleniyor(false);
      }
    }
    yukle();
  }, [kullaniciAdi]);

  if (yukleniyor) {
    return (
      <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
        <div className="mx-auto w-full max-w-md text-center py-12">
          <div className="inline-block w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-slate-400">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (hata || !profil) {
    return (
      <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
        <div className="mx-auto w-full max-w-md py-12">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
            <p className="text-sm text-slate-400">{hata || 'Kullanıcı bulunamadı.'}</p>
          </div>
        </div>
      </main>
    );
  }

  // Katılma tarihini format et
  const katilma = new Date(profil.olusturuldu);
  const kalanGun = Math.floor((Date.now() - katilma.getTime()) / 86_400_000) + 1;

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Başlık ve kullanıcı adı */}
        <header className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">{profil.kullaniciAdi}</h1>
          <p className="text-xs text-slate-500">
            {kalanGun} gün önce katıldı
          </p>
        </header>

        {/* İstatistikler kartı */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center">
            <div className="text-2xl font-black text-cyan-300">{profil.toplamTurSayisi}</div>
            <div className="text-xs text-slate-500 mt-1">Toplam tur</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center">
            <div className="text-2xl font-black text-cyan-300">{profil.tamIsabetSayisi}</div>
            <div className="text-xs text-slate-500 mt-1">Tam isabet</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center">
            <div className="text-2xl font-black text-cyan-300">
              {profil.toplamTurSayisi > 0 ? Math.round((profil.tamIsabetSayisi / profil.toplamTurSayisi) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Başarı oranı</div>
          </div>
        </div>

        {/* Seviye bazlı en iyi puanlar */}
        {profil.enIyiPuanlar.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              Seviye bazlı en iyi puanlar
            </h2>
            <div className="space-y-2">
              {profil.enIyiPuanlar
                .sort((a, b) => b.puan - a.puan)
                .map((s) => (
                  <div key={s.seviye} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
                    <span className="font-bold text-slate-200">{s.seviye}</span>
                    <span className="font-bold text-cyan-300">{s.puan}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Son 28 günlük aktivite */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
            Son 28 günlük aktivite
          </h2>
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
            {profil.son28Gun.map((g) => (
              <div
                key={g.tarih}
                title={g.tarih}
                className={`h-6 rounded-sm ${
                  g.var ? 'bg-cyan-300' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            İki hafta / sol = daha eski
          </p>
        </div>
      </div>
    </main>
  );
}
