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
import { nativeMi } from '../platform';
import { Browser } from '@capacitor/browser';
import Ikon from './Ikon';

export default function Menu() {
  const gecis = useNavigate();

  /** Ana sayfadayken event, başka rotadayken yönlendirip parametre bırak. */
  function anaSayfayaIstek(istek: 'yardim' | 'giris' | 'ana') {
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

  async function cikisYap() {
    setMenuAcik(false);
    await supabase.auth.signOut();
    gecis('/');
  }

  return (
    // zt-menu sınıfı: üst konumu stil.css belirler. Tailwind'in top-4'ü
    // kullanılamaz çünkü durum çubuğu yüksekliği (safe-area) eklenmeli;
    // aksi halde düğme saat/pil göstergesinin altında kalır ve
    // dokunulamaz.
    <div className="zt-menu fixed right-4 z-50">
      <button
        onClick={() => setMenuAcik((a) => !a)}
        data-alan="menu-ac"
        aria-label="Menü"
        aria-expanded={menuAcik}
        className="min-h-[48px] min-w-[48px] rounded-full border border-slate-700 bg-slate-900/85 text-xl text-cyan-200 shadow-lg backdrop-blur-sm"
      >
        ☰
      </button>

      {menuAcik && (
        <>
          {/* Menü dışına tıklanınca kapat */}
          <div className="fixed inset-0 -z-10" onClick={() => setMenuAcik(false)} />
          <div
            data-alan="menu"
            className="zt-menu-panel absolute right-0 top-14 z-20 rounded-2xl border border-slate-700 bg-[#0F1424] p-2 shadow-2xl"
          >
            {/* Kimlik satırı */}
            {kullanici && profil ? (
              <div className="mb-1 flex items-center justify-between rounded-lg px-4 py-2">
                <span data-alan="username" className="truncate text-sm font-bold text-slate-300" title={profil.kullaniciAdi}>
                  {profil.kullaniciAdi}
                </span>
                <button
                  onClick={cikisYap}
                  data-alan="cikis"
                  className="zt-dokunma-alani px-2 text-sm font-bold text-slate-400 hover:text-red-400"
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
                className="zt-menu-oge text-cyan-300"
              >
                Giriş yap
              </button>
            )}

            <div className="my-1 h-px bg-slate-800" />

            {/* ANA SAYFA
                Yalnızca `gecis('/')` yetmiyordu: oyun ve sonuç ekranları
                ayrı bir ROTA değil, ana rotanın içindeki durumlar. Zaten
                "/" üzerindeyken yönlendirme hiçbir şey değiştirmiyor ve
                düğme ölü görünüyordu — antrenman sonucundan ana sayfaya
                dönülemiyordu. Artık ana rotadayken olay gönderiliyor. */}
            <button
              onClick={() => {
                setMenuAcik(false);
                anaSayfayaIstek('ana');
              }}
              data-alan="ana-sayfa"
              className="zt-menu-oge text-slate-200"
            >
              <Ikon ad="ana-sayfa" className="mr-2.5 -mt-0.5" />
              Ana sayfa
            </button>

            <button
              onClick={() => git('/lig')}
              data-alan="lig-ac"
              className="zt-menu-oge text-slate-200"
            >
              <Ikon ad="siralama" className="mr-2.5 -mt-0.5" />
              Sıralamalar
            </button>

            {kullanici && profil && (
              <button
                onClick={() => git(`/o/${profil.kullaniciAdi}`)}
                className="zt-menu-oge text-slate-200"
              >
                <Ikon ad="profil" className="mr-2.5 -mt-0.5" />
                Profil
              </button>
            )}


            {/* SES ANAHTARI MENÜDEN ÇIKTI.
                Artık titreşimle birlikte tek yerde: kendi profilinde ve
                gizlilik ayarlarında. Menüde ayrı durduğu sürece ikisi
                birbirinden habersiz iki ayardı. */}
            <div className="my-1 h-px bg-slate-800" />

            <button
              onClick={() => {
                setMenuAcik(false);
                anaSayfayaIstek('yardim');
              }}
              data-alan="yardim-ac"
              className="zt-menu-oge text-slate-200"
            >
              <Ikon ad="soru" className="mr-2.5 -mt-0.5" />
              Nasıl oynanır
            </button>

            {/*
              Gizlilik ve yasal metinler MENÜDE durmalı.
              Giriş yapan kullanıcı bunlara profilinden de ulaşıyor, ama
              misafirin profili yok (/o/kullanici-adi bir kullanıcı adı
              ister). Yalnızca profile koyarsak misafir KVKK metnine
              hiçbir yerden ulaşamaz — bu hem KVKK hem Play Store
              açısından kabul edilemez.
            */}
            <button
              onClick={() => git('/yasal')}
              data-alan="yasal-ac"
              className="zt-menu-oge text-slate-200"
            >
              <Ikon ad="kalkan" className="mr-2.5 -mt-0.5" />
              Gizlilik ve yasal
            </button>

            {/* Sosyal */}
            <div className="my-1 h-px bg-slate-800" />
            <button
              onClick={instagramAc}
              data-alan="instagram"
              className="zt-menu-oge text-slate-400"
            >
              <Ikon ad="kamera" className="mr-2.5 -mt-0.5" />
              Instagram'da takip et
            </button>
          </div>
        </>
      )}
    </div>
  );
}
