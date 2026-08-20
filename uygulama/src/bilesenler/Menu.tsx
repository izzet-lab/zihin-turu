/**
 * Menu — tüm sayfalarda görünen sabit hamburger menü.
 *
 * Prop almaz: oturumu kendisi okur, ses tercihini kendisi yönetir.
 * `fixed right-4 top-4 z-50` konumunda durur; layout'lara dokunmaz.
 *
 * "Nasıl oynanır" ve "Giriş yap" ana sayfadaki Uygulama state'ine
 * CustomEvent veya URL parametresi ile ulaşır.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { profilOku, type OyuncuProfil } from '../kimlik';
import { sesAcikMi, sesTercihiYaz } from '../depo';
import { nativeMi } from '../platform';
import { Browser } from '@capacitor/browser';

export default function Menu() {
  const gecis = useNavigate();

  /** Ana sayfadayken event, başka rotadayken yönlendirip parametre bırak. */
  function anaSayfayaIstek(istek: 'yardim' | 'giris') {
    if (window.location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('zt-menu-istek', { detail: istek }));
    } else {
      gecis(`/?${istek}=1`);
      // Uygulama bileşeni parametreyi mount'ta okuyor; olay da gönderelim
      // ki zaten mount edilmişse anında tepki versin.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('zt-menu-istek', { detail: istek }));
      }, 0);
    }
  }

  const [menuAcik, setMenuAcik] = useState(false);
  const [sesAcik, setSesAcik] = useState<boolean>(sesAcikMi());
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [profil, setProfil] = useState<OyuncuProfil | null>(null);

  // Auth durumunu dinle
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setKullanici(u);
      if (u) profilOku(u.id).then(setProfil);
    });

    const { data: dinleyici } = supabase.auth.onAuthStateChange((_event, oturum) => {
      const u = oturum?.user ?? null;
      setKullanici(u);
      if (u) profilOku(u.id).then(setProfil);
      else setProfil(null);
    });

    return () => dinleyici.subscription.unsubscribe();
  }, []);

  // Escape tuşuyla kapat
  useEffect(() => {
    if (!menuAcik) return;
    function kapat(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuAcik(false);
    }
    window.addEventListener('keydown', kapat);
    return () => window.removeEventListener('keydown', kapat);
  }, [menuAcik]);

  /** Menüyü kapatıp rotayı değiştirir (tam sayfa yüklemesi yapmaz). */
  function git(yol: string) {
    setMenuAcik(false);
    gecis(yol);
  }

  /**
   * Instagram hesabını açar.
   *
   * Android'de sistem tarayıcısında açılır (Capacitor Browser); doğrudan
   * window.open kullanılırsa uygulamanın kendi webview'ında açılır ve
   * kullanıcı oyuna geri dönemez.
   */
  async function instagramAc() {
    setMenuAcik(false);
    const adres = 'https://www.instagram.com/zihinturuapp/';
    if (nativeMi()) {
      try {
        await Browser.open({ url: adres });
        return;
      } catch {
        // Açılamazsa aşağıdaki yola düş.
      }
    }
    window.open(adres, '_blank', 'noopener,noreferrer');
  }

  function sesDegistir() {
    const yeni = !sesAcik;
    setSesAcik(yeni);
    sesTercihiYaz(yeni);
  }

  async function cikisYap() {
    setMenuAcik(false);
    await supabase.auth.signOut();
    gecis('/');
  }

  return (
    // zt-menu sınıfı: üst banner varken menüyü aşağı kaydırmak için
    // stil.css tarafından kullanılıyor.
    <div className="zt-menu fixed right-4 top-4 z-50">
      <button
        onClick={() => setMenuAcik((a) => !a)}
        data-alan="menu-ac"
        aria-label="Menü"
        aria-expanded={menuAcik}
        className="min-h-[44px] min-w-[44px] rounded-full border border-slate-700 bg-slate-900/80 text-lg text-cyan-200 backdrop-blur-sm"
      >
        ☰
      </button>

      {menuAcik && (
        <>
          {/* Menü dışına tıklanınca kapat */}
          <div className="fixed inset-0 -z-10" onClick={() => setMenuAcik(false)} />
          <div
            data-alan="menu"
            className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-slate-800 bg-[#0F1424] p-2 shadow-xl"
          >
            {/* Kimlik satırı */}
            {kullanici && profil ? (
              <div className="mb-1 flex items-center justify-between rounded-lg px-3 py-2">
                <span data-alan="username" className="truncate text-sm font-bold text-slate-300" title={profil.kullaniciAdi}>
                  {profil.kullaniciAdi}
                </span>
                <button
                  onClick={cikisYap}
                  data-alan="cikis"
                  className="text-xs font-bold text-slate-500 hover:text-red-400"
                >
                  Çık
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMenuAcik(false);
                  anaSayfayaIstek('giris');
                }}
                data-alan="giris-ac"
                className="mb-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-cyan-300 hover:bg-slate-800/60"
              >
                Giriş yap
              </button>
            )}

            <div className="my-1 h-px bg-slate-800" />

            <button
              onClick={() => git('/')}
              data-alan="ana-sayfa"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              🏠 Ana sayfa
            </button>

            <button
              onClick={() => git('/lig')}
              data-alan="lig-ac"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              📊 Sıralamalar
            </button>

            {kullanici && profil && (
              <button
                onClick={() => git(`/o/${profil.kullaniciAdi}`)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
              >
                👤 Profil
              </button>
            )}

            {/* Hesaba dair ayarlar — Profil'in hemen altında toplanır. */}
            <button
              onClick={() => git('/gizlilik-ayarlari')}
              data-alan="gizlilik-ayarlari"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              🔒 Gizlilik ayarları
            </button>

            <button
              onClick={() => git('/yasal/kvkk')}
              data-alan="yasal"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              📄 Yasal metinler
            </button>

            {kullanici && (
              <button
                onClick={() => git('/yasal/hesap-sil')}
                data-alan="hesap-sil"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-400/80 hover:bg-slate-800/60 hover:text-red-400"
              >
                🗑️ Hesabımı sil
              </button>
            )}

            <div className="my-1 h-px bg-slate-800" />

            <button
              onClick={sesDegistir}
              data-alan="ses-ac-kapa"
              aria-pressed={sesAcik}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              {sesAcik ? '🔊 Ses açık' : '🔇 Ses kapalı'}
            </button>

            <button
              onClick={() => {
                setMenuAcik(false);
                anaSayfayaIstek('yardim');
              }}
              data-alan="yardim-ac"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              ❓ Nasıl oynanır
            </button>

            {/* Sosyal */}
            <div className="my-1 h-px bg-slate-800" />
            <button
              onClick={instagramAc}
              data-alan="instagram"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
            >
              📷 Instagram'da takip et
            </button>
          </div>
        </>
      )}
    </div>
  );
}
