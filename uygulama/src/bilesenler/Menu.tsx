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
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { profilOku, type OyuncuProfil } from '../kimlik';
import { sesAcikMi, sesTercihiYaz } from '../depo';

/** Ana sayfadayken event, başka rotadayken URL parametresiyle iletişim. */
function anaSayfayaIstek(istek: 'yardim' | 'giris') {
  if (window.location.pathname === '/') {
    window.dispatchEvent(new CustomEvent('zt-menu-istek', { detail: istek }));
  } else {
    window.location.href = `/?${istek}=1`;
  }
}

export default function Menu() {
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

  function sesDegistir() {
    const yeni = !sesAcik;
    setSesAcik(yeni);
    sesTercihiYaz(yeni);
  }

  async function cikisYap() {
    setMenuAcik(false);
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="fixed right-4 top-4 z-50">
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

            <a
              href="/"
              data-alan="ana-sayfa"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              🏠 Ana sayfa
            </a>

            <a
              href="/lig"
              data-alan="lig-ac"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              📊 Sıralamalar
            </a>

            {kullanici && profil && (
              <a
                href={`/o/${profil.kullaniciAdi}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800/60"
              >
                👤 Profil
              </a>
            )}

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

            {/* Yasal bağlantılar */}
            <div className="my-1 h-px bg-slate-800" />
            <a
              href="/yasal/kvkk"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
            >
              📄 Yasal bilgiler
            </a>

            {kullanici && (
              <a
                href="/yasal/hesap-sil"
                data-alan="hesap-sil"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400/70 hover:bg-slate-800/60 hover:text-red-400"
              >
                🗑️ Hesabımı sil
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
