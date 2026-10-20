/**
 * Yönetim paneli — /yonetim
 *
 * İlk iş giriş sistemini seçmek:
 *   Sistem 1: e-posta + parola + Google
 *   Sistem 2: yalnızca isim yazıp başlama (varsayılan)
 * Yanında kısa bir özet ve son oyuncular listesi.
 *
 * YETKİ SUNUCUDA. Bu sayfa kimin yönetici olduğunu bilmez, sorar
 * (`yonetici_mi`); sayfanın kodunu değiştiren biri de bir şey kazanmaz,
 * çünkü yazma ve okuma fonksiyonları yetkiyi kendileri denetliyor.
 *
 * Panelde e-posta adresi gösterilmiyor — gerekmiyor (KVKK veri
 * minimizasyonu). Reklam da yok (kural 5: banner yalnızca dört ekranda).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { isimleAcilmisMi, type GirisSistemi } from '../kimlik';
import {
  girisSistemiYaz,
  oyunculariOku,
  ozetOku,
  yoneticiMi,
  type YonetimOyuncu,
  type YonetimOzet,
} from '../yonetim';

type Durum = 'yukleniyor' | 'giris' | 'yetkisiz' | 'panel';

const SISTEMLER: { anahtar: GirisSistemi; ad: string; aciklama: string }[] = [
  {
    anahtar: 'sistem1',
    ad: 'Sistem 1 — E-posta ve parola',
    aciklama: 'Oyuncu e-posta ve parolayla (ya da Google ile) hesap açar.',
  },
  {
    anahtar: 'sistem2',
    ad: 'Sistem 2 — İsimle başla',
    aciklama:
      'Oyuncu yalnızca ismini yazar; kullanıcı adı isimden üretilir. ' +
      'Sonradan profilinden e-posta ve parola ekleyip hesabını kalıcı yapabilir.',
  },
];

function tarihYaz(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function Yonetim() {
  const navigate = useNavigate();
  const [durum, setDurum] = useState<Durum>('yukleniyor');
  const [kullanici, setKullanici] = useState<User | null>(null);

  const denetle = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;
    setKullanici(u);
    if (!u) return setDurum('giris');
    setDurum((await yoneticiMi()) ? 'panel' : 'yetkisiz');
  }, []);

  useEffect(() => {
    denetle();
  }, [denetle]);

  async function cikis() {
    await supabase.auth.signOut();
    setDurum('giris');
  }

  if (durum === 'yukleniyor') {
    return <main className="min-h-dvh zt-kagit" aria-busy="true" />;
  }

  if (durum === 'giris') return <YoneticiGirisi onGirildi={denetle} />;

  if (durum === 'yetkisiz') {
    // İsimle açılmış hesabı çıkış yaptırmak o hesabı bu cihazdan
    // silmek demek; ona çıkış düğmesi gösterilmez.
    const isimle = isimleAcilmisMi(kullanici);
    return (
      <main className="min-h-dvh zt-kagit zt-metin zt-ust-bosluk flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center" data-alan="yonetim-yetkisiz">
          <h1 className="text-xl font-black zt-metin mb-3">Bu sayfa yöneticiler için</h1>
          <p className="text-sm zt-metin-soluk mb-6">Açık olan hesabın yönetim yetkisi yok.</p>
          <button
            onClick={() => navigate('/')}
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin"
          >
            Ana sayfaya dön
          </button>
          {!isimle && (
            <button onClick={cikis} className="mt-3 min-h-[44px] w-full text-sm zt-metin-soluk">
              Çıkış yap ve yönetici olarak gir
            </button>
          )}
        </div>
      </main>
    );
  }

  return <Panel onCikis={cikis} />;
}

/** Yönetici girişi — her zaman e-posta + parola, seçilen giriş sisteminden bağımsız. */
function YoneticiGirisi({ onGirildi }: { onGirildi: () => void }) {
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gir() {
    setHata(null);
    setYukleniyor(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: eposta.trim().toLowerCase(),
        password: parola,
      });
      if (error) {
        setHata(/invalid login credentials/i.test(error.message) ? 'E-posta veya parola hatalı.' : error.message);
        return;
      }
      onGirildi();
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <main className="min-h-dvh zt-kagit zt-metin zt-ust-bosluk flex items-center justify-center px-5">
      <div className="w-full max-w-sm" data-alan="yonetim-giris">
        <h1 className="text-2xl font-black zt-metin text-center mb-6">Yönetim</h1>
        <div className="space-y-3">
          <input
            type="email"
            autoComplete="username"
            value={eposta}
            onChange={(e) => { setEposta(e.target.value); setHata(null); }}
            placeholder="E-posta"
            className="w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={parola}
            onChange={(e) => { setParola(e.target.value); setHata(null); }}
            onKeyDown={(e) => e.key === 'Enter' && gir()}
            placeholder="Parola"
            className="w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
          />
          {hata && <p className="text-sm zt-sure-metin">{hata}</p>}
          <button
            onClick={gir}
            disabled={yukleniyor}
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin disabled:opacity-50"
          >
            {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </div>
      </div>
    </main>
  );
}

function Panel({ onCikis }: { onCikis: () => void }) {
  const [ozet, setOzet] = useState<YonetimOzet | null>(null);
  const [oyuncular, setOyuncular] = useState<YonetimOyuncu[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState<GirisSistemi | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    const [o, l] = await Promise.all([ozetOku(), oyunculariOku()]);
    setOzet(o);
    setOyuncular(l);
  }, []);

  useEffect(() => {
    yenile();
  }, [yenile]);

  async function sistemSec(sistem: GirisSistemi) {
    if (ozet?.giris_sistemi === sistem) return;
    setMesaj(null);
    setKaydediliyor(sistem);
    const hata = await girisSistemiYaz(sistem);
    setKaydediliyor(null);
    if (hata) return setMesaj(hata);
    setOzet((o) => (o ? { ...o, giris_sistemi: sistem } : o));
    setMesaj('Kaydedildi. Giriş ekranını yeni açan herkes bu sistemi görür.');
  }

  const etkin = ozet?.giris_sistemi ?? 'sistem2';
  const kutular: [string, number | undefined][] = [
    ['Oyuncu', ozet?.oyuncu],
    ['İsimle', ozet?.isimle],
    ['Doğrulanmış', ozet?.dogrulanmis],
    ['Bugün yeni', ozet?.bugun_yeni],
    ['Bugün tur', ozet?.bugun_tur],
    ['Bugün düello', ozet?.bugun_duello],
  ];

  return (
    <main className="min-h-dvh zt-kagit zt-metin zt-ust-bosluk px-5 pb-10">
      <div className="mx-auto w-full max-w-2xl" data-alan="yonetim-panel">
        <header className="mb-6 flex items-center justify-between gap-3 pt-4">
          <h1 className="text-2xl font-black zt-metin">Yönetim</h1>
          <button
            onClick={onCikis}
            className="min-h-[44px] rounded-xl border zt-cizgi zt-yuzey px-4 text-sm font-bold zt-metin-soluk"
          >
            Çıkış
          </button>
        </header>

        {/* Giriş sistemi */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest zt-metin-soluk">Giriş sistemi</h2>
          <div className="space-y-2" role="radiogroup" aria-label="Giriş sistemi">
            {SISTEMLER.map((s) => {
              const secili = etkin === s.anahtar;
              return (
                <button
                  key={s.anahtar}
                  role="radio"
                  aria-checked={secili}
                  data-alan={`sistem-${s.anahtar}`}
                  onClick={() => sistemSec(s.anahtar)}
                  disabled={kaydediliyor !== null}
                  className={
                    'flex min-h-[44px] w-full items-start gap-3 rounded-xl border p-4 text-left disabled:opacity-60 ' +
                    (secili ? 'zt-vurgu-cizgi zt-yuzey' : 'zt-cizgi zt-yuzey')
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      'mt-1 h-4 w-4 shrink-0 rounded-full border-2 ' +
                      (secili ? 'zt-vurgu-cizgi zt-dugme' : 'zt-cizgi')
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-black zt-metin">
                      {s.ad}
                      {kaydediliyor === s.anahtar && <span className="ml-2 zt-metin-soluk">kaydediliyor…</span>}
                    </span>
                    <span className="mt-1 block text-xs zt-metin-soluk leading-relaxed">{s.aciklama}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {mesaj && <p className="mt-3 text-sm zt-metin" data-alan="yonetim-mesaj">{mesaj}</p>}
        </section>

        {/* Özet */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">Özet</h2>
            <button onClick={yenile} className="min-h-[44px] px-2 text-xs font-bold zt-vurgu-metin">
              Yenile
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {kutular.map(([ad, deger]) => (
              <div key={ad} className="rounded-lg border zt-cizgi zt-yuzey p-3 text-center">
                <div className="zt-rakam text-xl font-black zt-vurgu-metin">{deger ?? '—'}</div>
                <div className="mt-1 text-[11px] zt-metin-soluk">{ad}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Son oyuncular */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest zt-metin-soluk">Son oyuncular</h2>
          {oyuncular.length === 0 ? (
            <p className="text-sm zt-metin-soluk">Henüz oyuncu yok.</p>
          ) : (
            <ul className="divide-y zt-cizgi rounded-xl border zt-cizgi zt-yuzey">
              {oyuncular.map((o) => (
                <li key={o.kullanici_adi} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold zt-metin">
                      {o.gorunen_ad ?? o.kullanici_adi}
                      <span className="ml-2 font-normal zt-metin-soluk">@{o.kullanici_adi}</span>
                    </div>
                    <div className="text-[11px] zt-metin-soluk">
                      Katıldı {tarihYaz(o.olusturuldu)} · son tur {tarihYaz(o.son_tur)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="zt-rakam text-sm font-black zt-metin">{o.tur_sayisi} tur</div>
                    <div className={'text-[11px] ' + (o.dogrulanmis ? 'zt-vurgu-metin' : 'zt-metin-soluk')}>
                      {o.dogrulanmis ? 'doğrulanmış' : 'isimle'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
