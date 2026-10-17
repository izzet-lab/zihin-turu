/**
 * ProfilSayfasi.tsx — Herkese açık profil, /o/kullanici-adi
 * Kullanıcının seviye bazlı en iyi puanları, aktivite göstergesi, istatistikler.
 */

import { useEffect, useState } from 'react';
import Ikon from '../bilesenler/Ikon';
import OyunAyarlari from '../bilesenler/OyunAyarlari';
import { useParams, useNavigate } from 'react-router-dom';
import { seviyeEtiketi } from '@tamisabet/oyun-sayi';
import { profilIstatistikOku, type ProfilIstatistik } from '../lig-sorgu';
import { profilOku } from '../kimlik';
import { supabase } from '../supabase';
import { bannerGoster, bannerKaldir } from '../reklam';
import GenelDagilim from '../bilesenler/GenelDagilim';

export default function ProfilSayfasi() {
  const { kullaniciAdi } = useParams<{ kullaniciAdi: string }>();
  const navigate = useNavigate();

  // Profil de kaydırılarak okunan bir ekran; banner altta durur.
  useEffect(() => {
    bannerGoster('alt');
    return () => {
      bannerKaldir();
    };
  }, []);

  const [profil, setProfil] = useState<ProfilIstatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  // Kendi profilini mi görüntülüyor?
  const [kendiProfili, setKendiProfili] = useState(false);

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
        // Giriş yapan kullanıcının kendi profili mi kontrol et
        const { data: oturum } = await supabase.auth.getSession();
        if (oturum.session) {
          const kendi = await profilOku(oturum.session.user.id);
          if (kendi && kendi.kullaniciAdi === kullaniciAdi) {
            setKendiProfili(true);
          }
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
      <main className="min-h-dvh zt-kagit zt-metin px-5 py-8">
        <div className="mx-auto w-full max-w-md text-center py-12">
          <div className="inline-block w-4 h-4 border-2 zt-vurgu-cizgi border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm zt-metin-soluk">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (hata || !profil) {
    return (
      <main className="min-h-dvh zt-kagit zt-metin px-5 py-8">
        <div className="mx-auto w-full max-w-md py-12">
          <div className="rounded-lg border zt-cizgi zt-yuzey p-6 text-center">
            <p className="text-sm zt-metin-soluk">{hata || 'Kullanıcı bulunamadı.'}</p>
          </div>
        </div>
      </main>
    );
  }

  // Katılma tarihini format et
  const katilma = new Date(profil.olusturuldu);
  const kalanGun = Math.floor((Date.now() - katilma.getTime()) / 86_400_000) + 1;

  return (
    <main className="min-h-dvh zt-kagit zt-metin px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Başlık ve kullanıcı adı */}
        <header className="mb-8">
          <h1 className="text-3xl font-black zt-metin mb-2">{profil.kullaniciAdi}</h1>
          <p className="text-xs zt-metin-soluk">
            {kalanGun} gün önce katıldı
          </p>
        </header>

        {/* İstatistikler kartı */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border zt-cizgi zt-yuzey p-4 text-center">
            <div className="text-2xl font-black zt-vurgu-metin">{profil.toplamTurSayisi}</div>
            <div className="text-xs zt-metin-soluk mt-1">Toplam tur</div>
          </div>
          <div className="rounded-lg border zt-cizgi zt-yuzey p-4 text-center">
            <div className="text-2xl font-black zt-vurgu-metin">{profil.tamIsabetSayisi}</div>
            <div className="text-xs zt-metin-soluk mt-1">Tam isabet</div>
          </div>
          <div className="rounded-lg border zt-cizgi zt-yuzey p-4 text-center">
            <div className="text-2xl font-black zt-vurgu-metin">
              {profil.toplamTurSayisi > 0 ? Math.round((profil.tamIsabetSayisi / profil.toplamTurSayisi) * 100) : 0}%
            </div>
            <div className="text-xs zt-metin-soluk mt-1">Başarı oranı</div>
          </div>
        </div>

        {/* GENEL TOPLAM — iki oyun birlikte.
            Sayfa uzun süre yalnızca sayı turunu anlatıyordu; kelime
            turu oynayan biri kendi profilinde görünmüyordu bile. */}
        {profil.genelAylik && profil.genelAylik.toplam > 0 && (
          <div className="mb-8 rounded-xl border zt-cizgi zt-yuzey p-4" data-alan="profil-genel">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-bold zt-metin">Genel sıralama — bu ay</span>
              <span className="zt-rakam text-2xl font-black zt-vurgu-metin">
                {profil.genelAylik.toplam}
              </span>
            </div>
            <GenelDagilim
              sayiPuan={profil.genelAylik.sayiPuan}
              kelimePuan={profil.genelAylik.kelimePuan}
              bonus={profil.genelAylik.bonus}
            />
            <p className="mt-2 text-[11px] zt-metin-soluk">
              İki oyunun toplamı, seviye ağırlıklı. Aynı gün iki turu da bitirmek %25 bonus
              getiriyor.
            </p>
          </div>
        )}

        {/* Seviye bazlı en iyi puanlar */}
        {profil.enIyiPuanlar.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest zt-metin-soluk mb-4">
              Seviye bazlı en iyi puanlar
            </h2>
            <div className="space-y-2">
              {profil.enIyiPuanlar
                .sort((a, b) => b.puan - a.puan)
                .map((s) => (
                  <div key={s.seviye} className="flex items-center justify-between rounded-lg border zt-cizgi zt-yuzey px-4 py-3">
                    <span className="font-bold zt-metin">{seviyeEtiketi(s.seviye)}</span>
                    <span className="font-bold zt-vurgu-metin">{s.puan}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Son 28 günlük aktivite */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest zt-metin-soluk mb-4">
            Son 28 günlük aktivite
          </h2>
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
            {profil.son28Gun.map((g) => (
              <div
                key={g.tarih}
                title={g.tarih}
                className={`h-6 rounded-sm ${
                  g.var ? 'zt-dugme' : 'zt-ayirac'
                }`}
              />
            ))}
          </div>
          <p className="text-xs zt-metin-soluk mt-3 text-center">
            İki hafta / sol = daha eski
          </p>
        </div>

        {/* OYUN VE HESAP AYARLARI — yalnızca kendi profilinde.
            Başkasının profilinde ses anahtarı göstermek anlamsız. */}
        {kendiProfili && (
          <div className="mt-10 space-y-2">
            <div className="my-2 h-px zt-ayirac" />
            <OyunAyarlari />
            <div className="my-3 h-px zt-ayirac" />
            <button
              onClick={() => navigate('/gizlilik-ayarlari')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold zt-metin"
            >
              <Ikon ad="ayar" boyut={16} className="mr-2 -mt-0.5" />
            Gizlilik ayarları
            </button>
            <button
              onClick={() => navigate('/yasal/kvkk')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold zt-metin"
            >
              <Ikon ad="belge" boyut={16} className="mr-2 -mt-0.5" />
            Yasal metinler
            </button>
            <button
              onClick={() => navigate('/yasal/hesap-sil')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold zt-sure-metin"
            >
              <Ikon ad="cop" boyut={16} className="mr-2 -mt-0.5" />
            Hesabımı sil
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
