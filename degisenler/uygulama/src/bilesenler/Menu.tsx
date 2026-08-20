/**
 * Menu.tsx — Her sayfada görünen tek hamburger menü.
 *
 * Daha önce menü yalnızca Kurulum ekranının başlığında vardı; Lig, Oyun,
 * Sonuç ve yasal sayfalarda oyuncu menüsüz kalıyordu. Bu bileşen Ana.tsx'te
 * bir kez, sabit (fixed) konumda render edilir; böylece rota fark etmeksizin
 * menü hep aynı yerdedir.
 *
 * Kendi kendine yeterlidir: oturumu Supabase'ten, ses tercihini depodan okur.
 * "Nasıl oynanır" ve "Giriş yap" ana sayfadaki Uygulama bileşenine
 * pencere olayı (aynı sayfadaysak) veya sorgu parametresi (başka rotadaysak)
 * ile iletilir.
 */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { profilOku, type OyuncuProfil } from '../kimlik';
import { sesAcikMi, sesTercihiYaz } from '../depo';

/** Ana sayfadaysak olay yolla, değilsek sorgu parametresiyle ana sayfaya git. */
function anaSayfayaIstek(istek: 'yardim' | 'giris') {
  if (window.location.pathname === '/') {
    window.dispatchEvent(new CustomEvent('zt-menu-istek', { detail: istek }));
  } else {
    window.location.href = `/?${istek}=1`;
  }
}

export default function Menu() {
  const [acik, setAcik] = useState(false);
  const [sesAcik, setSesAcik] = useState<boolean>(sesAcikMi);
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [profil, setProfil] = useState<OyuncuProfil | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setKullanici(u);
      if (u) profilOku(u.id).then(setProfil);
    });

    const { data: dinleyici } = supabase.auth.onAuthStateChange((_e, oturum) => {
      const u = oturum?.user ?? null;
      setKullanici(u);
      if (u) profilOku(u.id).then(setProfil);
      else setProfil(null);
    });

    return () => dinleyici.subscription.unsubscribe();
  }, []);

  // Escape ile kapansın — klavye kullanıcısı menüde kilitli kalmasın.
  useEffect(() => {
    if (!acik) return;
    function tus(e: KeyboardEvent) {
      if (e.key === 'Escape') setAcik(false);
    }
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [acik]);

  function sesDegistir() {
    const yeni = !sesAcik;
    setSesAcik(yeni);
    sesTercihiYaz(yeni);
  }

  const ad = profil?.kullaniciAdi ?? kullanici?.email ?? 'Oyuncu';

  return (
    <div className="fixed right-4 top-4 z-50">
      <button
        onClick={() => setAcik((a) => !a)}
        data-alan="menu-ac"
        aria-label="Menü"
        aria-expanded={acik}
        className="min-h-[44px] min-w-[44px] rounded-full border border-slate-700 bg-slate-900/80 text-lg text-cyan-200 backdrop-blur"
      >
        ☰
      </button>

      {acik && (
        <>
          {/* Menü dışına tıklanınca kapat */}
          <div className="fixed inset-0 -z-10" onClick={() => setAcik(false)} />
          <div
            data-alan="menu"
            className="absolute right-0 top-12 w-56 rounded-xl border border-slate-800 bg-[#0F1424] p-2 shadow-xl"
          >
            {/* Kimlik satırı */}
            {kullanici ? (
              <div className="mb-1 flex items-center justify-between rounded-lg px-3 py-2">
                <span data-alan="username" className="truncate text-sm font-bold text-slate-300" title={ad}>
                  {ad}
                </span>
                <button
                  onClick={async () => {
                    setAcik(false);
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                  data-alan="cikis"
                  className="text-xs font-bold text-slate-500 hover:text-red-400"
                >
                  Çık
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAcik(false);
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
                setAcik(false);
                anaSayfayaIstek('yardim');
              }}
              data-alan="yardim-ac"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-slate-800/60"
            >
              ❓ Nasıl oynanır
            </button>
          </div>
        </>
      )}
    </div>
  );
}
