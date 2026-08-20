/**
 * Ana.tsx — React Router ile route yapılandırması.
 *
 * İki türde rota:
 * 1. Oyun rotaları: / (kurulum/oyun/sonuc/giriş/adı), /lig
 * 2. Herkese açık sayfalar: /o/:kullaniciAdi (profil), /yasal/* (KVKK, gizlilik…)
 *
 * Oyun rotalarında auth durumu izlenip profilOku yapılır (Supabase RLS).
 * Yasal sayfalar statiktir.
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import Uygulama from './Uygulama';
import Lig from './ekranlar/Lig';
import ProfilSayfasi from './ekranlar/ProfilSayfasi';
import Menu from './bilesenler/Menu';
import GizlilikAyarlari from './ekranlar/GizlilikAyarlari';
import { supabase } from './supabase';
import {
  KVKKSayfasi,
  GizlilikSayfasi,
  CerezSayfasi,
  KullanimKosullariSayfasi,
  HesapSilSayfasi,
} from './ekranlar/YasalSayfalar';

export default function Ana() {
  const [kullanici, setKullanici] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setKullanici(data.session?.user ?? null);
    });

    const { data: dinleyici } = supabase.auth.onAuthStateChange((_event, oturum) => {
      setKullanici(oturum?.user ?? null);
    });

    return () => dinleyici.subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Menu />
      <Routes>
        {/* Oyun rotaları — Uygulama bileşeni; içinde: kurulum/oyun/sonuc/giris */}
        <Route path="/" element={<Uygulama />} />
        <Route path="/lig" element={<Lig oyuncuId={kullanici?.id} />} />

        {/* Herkese açık profil sayfası */}
        <Route path="/o/:kullaniciAdi" element={<ProfilSayfasi />} />

        {/* Yasal sayfalar */}
        <Route path="/yasal/kvkk" element={<KVKKSayfasi onGeri={() => window.history.back()} />} />
        <Route path="/yasal/gizlilik" element={<GizlilikSayfasi onGeri={() => window.history.back()} />} />
        <Route path="/yasal/cerez" element={<CerezSayfasi onGeri={() => window.history.back()} />} />
        <Route path="/yasal/kullanim-kosullari" element={<KullanimKosullariSayfasi onGeri={() => window.history.back()} />} />
        <Route path="/yasal/hesap-sil" element={<HesapSilSayfasi onGeri={() => window.history.back()} />} />
        <Route path="/gizlilik-ayarlari" element={<GizlilikAyarlari onGeri={() => window.history.back()} />} />

        {/* 404 */}
        <Route path="*" element={<Div404 />} />
      </Routes>
    </BrowserRouter>
  );
}

function Div404() {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-black text-white mb-2">404</h1>
        <p className="text-slate-400 mb-6">Sayfa bulunamadı</p>
        <a href="/" className="inline-block px-6 py-2 rounded-lg bg-cyan-300 text-slate-900 font-bold hover:bg-cyan-200">
          Ana sayfaya dön
        </a>
      </div>
    </main>
  );
}
