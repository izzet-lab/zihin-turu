/**
 * Profilini doğrula — isimle açılmış hesaba e-posta + parola bağlar.
 *
 * İsimle giriş (sistem 2) hesabı bu cihaza bağlı açıyor. Oyuncu telefonu
 * değiştirir ya da uygulamayı silerse hesap, puanlar ve kullanıcı adı
 * kaybolur. Burada e-posta ve parola eklenince hesap kalıcı olur; aynı
 * hesap başka cihazdan e-posta + parolayla açılabilir. Hiçbir şey sıfırlanmaz.
 *
 * Yalnızca kendi profilinde ve yalnızca isimle açılmış hesapta görünür.
 */

import { useState } from 'react';
import Ikon from './Ikon';
import { hesabiDogrula } from '../kimlik';

interface Props {
  /** Doğrulama bitince çağrılır; üst bileşen bölümü gizler. */
  onDogrulandi: () => void;
}

export default function ProfilDogrula({ onDogrulandi }: Props) {
  const [acik, setAcik] = useState(false);
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [parolaGorunur, setParolaGorunur] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kaydet() {
    setHata(null);
    setYukleniyor(true);
    try {
      const sonuc = await hesabiDogrula(eposta, parola);
      if (sonuc) setHata(sonuc);
      else onDogrulandi();
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <section className="rounded-xl border zt-odul-yuzey p-4" data-alan="profil-dogrula">
      <div className="flex items-start gap-3">
        <Ikon ad="kalkan" boyut={20} className="mt-0.5 zt-odul-yazi" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black zt-metin">Profilini doğrula</h2>
          <p className="mt-1 text-xs zt-metin-soluk leading-relaxed">
            Hesabın şu an yalnızca bu cihazda. Telefonu değiştirirsen ya da uygulamayı
            silersen puanların kaybolur. E-posta ve parola ekle, hesabın kalıcı olsun.
          </p>
        </div>
      </div>

      {!acik ? (
        <button
          onClick={() => setAcik(true)}
          className="mt-3 min-h-[44px] w-full rounded-xl zt-dugme text-sm font-black zt-metin"
        >
          E-posta ve parola ekle
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">E-posta</span>
            <input
              type="email"
              autoComplete="email"
              value={eposta}
              onChange={(e) => { setEposta(e.target.value); setHata(null); }}
              placeholder="ornek@mail.com"
              data-alan="dogrula-eposta"
              className="mt-1 w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">Parola</span>
            <div className="mt-1 flex items-stretch gap-2">
              <input
                type={parolaGorunur ? 'text' : 'password'}
                autoComplete="new-password"
                value={parola}
                onChange={(e) => { setParola(e.target.value); setHata(null); }}
                onKeyDown={(e) => e.key === 'Enter' && kaydet()}
                placeholder="En az 8 karakter"
                data-alan="dogrula-parola"
                className="min-w-0 flex-1 rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
              />
              <button
                type="button"
                onClick={() => setParolaGorunur((v) => !v)}
                aria-label={parolaGorunur ? 'Parolayı gizle' : 'Parolayı göster'}
                className="min-h-[52px] min-w-[52px] rounded-xl border zt-cizgi zt-yuzey text-xs font-bold zt-metin-soluk"
              >
                {parolaGorunur ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </label>

          {hata && <p className="text-sm zt-sure-metin">{hata}</p>}

          <button
            onClick={kaydet}
            disabled={yukleniyor}
            data-alan="dogrula-kaydet"
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin disabled:opacity-50"
          >
            {yukleniyor ? 'Kaydediliyor…' : 'Hesabımı kalıcı yap'}
          </button>
        </div>
      )}
    </section>
  );
}
