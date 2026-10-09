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
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import Uygulama from './Uygulama';
import Lig from './ekranlar/Lig';
import Duello from './ekranlar/Duello';
import Arena from './ekranlar/Arena';
import KelimeTuru from './ekranlar/KelimeTuru';
import ProfilSayfasi from './ekranlar/ProfilSayfasi';
import Menu from './bilesenler/Menu';
import KutlamaKatmani from './bilesenler/Kutlama';
import { ilkFotografiAl } from './kutlama';
import YasalIndeks from './ekranlar/YasalIndeks';
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

  /*
   * İlk fotoğraf sessizce alınır.
   *
   * Olmasaydı hesabına ilk kez giren oyuncuya o güne kadar kazandığı
   * bütün rozetler arka arkaya kutlanırdı.
   */
  useEffect(() => {
    void ilkFotografiAl(kullanici?.id);
  }, [kullanici?.id]);

  return (
    <BrowserRouter>
      <Menu />
      {/* Ödül töreni tek yerde: tur hangi ekranda biterse bitsin
          kutlama buradan çıkıyor. */}
      <KutlamaKatmani />
      <Routes>
        {/* Oyun rotaları — Uygulama bileşeni; içinde: kurulum/oyun/sonuc/giris */}
        <Route path="/" element={<Uygulama />} />
        <Route path="/lig" element={<LigRota oyuncuId={kullanici?.id} />} />
        <Route path="/duello" element={<DuelloRota girisYapildiMi={!!kullanici} />} />
        <Route path="/arena" element={<ArenaRota girisYapildiMi={!!kullanici} />} />
        <Route path="/kelime" element={<KelimeRota kullanici={kullanici} />} />

        {/* Herkese açık profil sayfası */}
        <Route path="/o/:kullaniciAdi" element={<ProfilSayfasi />} />

        {/* Yasal sayfalar */}
        <Route path="/yasal" element={<YasalIndeks onGeri={() => window.history.back()} />} />
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

/**
 * Düello rotası — seviye adres satırından gelir.
 *
 * Ayrı rota olmasının sebebi: düello tek kişilik akışın parçası değil.
 * Rakip, derece ve canlı bağlantı gerektiriyor; Kurulum'un mod
 * seçicisine üçüncü bir kutu eklemek tek kişilik akışı da karmaşıklaştırırdı.
 */
function DuelloRota({ girisYapildiMi }: { girisYapildiMi: boolean }) {
  const gecis = useNavigate();
  const [parametreler] = useSearchParams();
  const seviye = parametreler.get('seviye') ?? 'normal';
  const oyun = parametreler.get('oyun') ?? undefined;
  return (
    <Duello
      seviye={seviye}
      oyun={oyun}
      girisYapildiMi={girisYapildiMi}
      onCik={() => gecis('/')}
      onGirisAc={() => gecis('/?giris=1')}
    />
  );
}

/**
 * Arena rotası — seviye adres satırından gelir.
 *
 * Düello gibi ayrı rota: arena da tek kişilik akışın parçası değil,
 * beş yarışçı ve canlı bağlantı gerektiriyor.
 */
function ArenaRota({ girisYapildiMi }: { girisYapildiMi: boolean }) {
  const gecis = useNavigate();
  const [parametreler] = useSearchParams();
  const seviye = parametreler.get('seviye') ?? 'normal';
  const oyun = parametreler.get('oyun') ?? undefined;
  return (
    <Arena
      seviye={seviye}
      oyun={oyun}
      girisYapildiMi={girisYapildiMi}
      onCik={() => gecis('/')}
      onGirisAc={() => gecis('/?giris=1')}
    />
  );
}

/**
 * Kelime turu rotasi.
 *
 * Ekran kendi sozlugunu sonradan yukluyor; burada bir sey beklemiyoruz.
 */
/** Sıralamalar; ana ekrandan gelen `?sekme=` ile açılır. */
function LigRota({ oyuncuId }: { oyuncuId?: string }) {
  const [parametreler] = useSearchParams();
  const s = parametreler.get('sekme');
  const sekme = s === 'duello' || s === 'arena' ? s : undefined;
  return <Lig oyuncuId={oyuncuId} baslangicSekme={sekme} />;
}

function KelimeRota({ kullanici }: { kullanici: User | null }) {
  const gecis = useNavigate();
  const [parametreler] = useSearchParams();
  const seviye = parametreler.get('seviye') ?? undefined;
  // Ana ekranda oyun ve mod birlikte seçiliyor; kelime ekranı o modla
  // açılmalı, oyuncuya aynı seçimi iki kez yaptırmamalı.
  const m = parametreler.get('mod');
  const mod = m === 'gunun' || m === 'antrenman' ? m : undefined;
  return (
    <KelimeTuru
      baslangicSeviye={seviye}
      baslangicMod={mod}
      kullanici={kullanici ? { ad: kullanici.email ?? '', id: kullanici.id } : null}
      onGirisAc={() => gecis('/?giris=1')}
      onCik={() => gecis('/')}
    />
  );
}

function Div404() {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-black text-white mb-2">404</h1>
        <p className="text-slate-400 mb-6">Sayfa bulunamadı</p>
        <Link to="/" className="inline-block px-6 py-2 rounded-lg bg-cyan-300 text-slate-900 font-bold hover:bg-cyan-200">
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
