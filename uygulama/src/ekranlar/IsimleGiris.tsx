/**
 * İsimle giriş (sistem 2) — oyuncu ismini yazar ve başlar.
 *
 * E-posta, parola, posta onayı yok. Hesap Supabase'in anonim oturumuyla
 * açılır; kullanıcı adı isimden üretilir ("Nazım" → "nazim", bkz.
 * isim-karar.ts). Puanlar sunucuda doğrulanıp lige işler — misafirden
 * farkı bu.
 *
 * BEDELİ: hesap bu cihaza bağlı. Oyuncu profilinde e-posta + parola
 * ekleyene kadar başka cihazdan aynı hesaba giremez; uygulama silinirse
 * hesap kaybolur. Profildeki "Profilini doğrula" bölümü bunu çözüyor.
 *
 * YAŞ KAPISI KALIYOR (kural 6). Hesap açılıyor ve lig tablosunda
 * görünüyor; 13 altı kayıt yasağı ve 13–17 veli onayı e-postadan
 * bağımsız. Doğum yılı tek alan, sürtünmesi küçük.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../bilesenler/Logo';
import YasEngeli from '../bilesenler/YasEngeli';
import { isimleBasla } from '../kimlik';
import { isimDogrula, kullaniciAdiAdaylari } from '../isim-karar';
import { yasDurumu } from '../yas-karar';
import { dogumYiliYaz, veliOnayiYaz } from '../depo';

interface Props {
  onAtla: () => void;
  /** "Hesabın var mı?" — e-posta + parola ekranına geçer. */
  onEpostaIleGiris: () => void;
}

export default function IsimleGiris({ onAtla, onEpostaIleGiris }: Props) {
  const [isim, setIsim] = useState('');
  const [dogumYili, setDogumYili] = useState('');
  const [veliOnayi, setVeliOnayi] = useState(false);
  const [kosullarKabul, setKosullarKabul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yasEngeli, setYasEngeli] = useState(false);

  const yas = yasDurumu(dogumYili);
  // Oyuncuya kullanıcı adının ne olacağını önceden göster; sürpriz olmasın.
  const onerilenAd = isimDogrula(isim) ? null : kullaniciAdiAdaylari(isim, 1)[0] ?? null;

  async function basla() {
    const isimHatasi = isimDogrula(isim);
    if (isimHatasi) return setHata(isimHatasi);
    if (yas.tur === 'bos') return setHata('Doğum yılını gir.');
    if (yas.tur === 'gecersiz') return setHata('Geçerli bir doğum yılı gir.');
    if (yas.tur === 'kucuk') return setYasEngeli(true);
    if (yas.tur === 'veli' && !veliOnayi) return setHata('Devam etmek için velinin onayı gerekiyor.');
    if (!kosullarKabul) return setHata('Devam etmek için koşulları kabul etmelisin.');

    setHata(null);
    setYukleniyor(true);
    try {
      // Reklam kişiselleştirmesi bu bilgiye bakıyor (kural 6) — oturumdan önce yazılır.
      dogumYiliYaz(yas.yil);
      if (yas.tur === 'veli') veliOnayiYaz(true);
      const sonuc = await isimleBasla(isim);
      if (sonuc) setHata(sonuc);
      // Başarılıysa oturum dinleyicisi profili açıp önceki ekrana döner.
    } finally {
      setYukleniyor(false);
    }
  }

  if (yasEngeli) {
    return (
      <YasEngeli
        onMisafir={onAtla}
        onDuzelt={() => { setYasEngeli(false); setDogumYili(''); }}
      />
    );
  }

  return (
    <main className="min-h-dvh zt-kagit zt-metin flex items-center justify-center px-5">
      <div className="w-full max-w-sm" data-alan="isimle-giris">
        <div className="text-center mb-6">
          <Logo boyut={48} className="zt-vurgu-metin mx-auto mb-3" />
          <h1 className="text-2xl font-black zt-metin">Tam İsabet</h1>
          <p className="mt-2 text-sm zt-metin-soluk">
            İsmini yaz, başla. Puanların lig tablosuna işler.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">İsim</span>
            <input
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={32}
              value={isim}
              onChange={(e) => { setIsim(e.target.value); setHata(null); }}
              placeholder="Örn: Nazım"
              data-alan="isim"
              className="mt-1 w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
            />
            {onerilenAd && (
              <span className="mt-1 block text-xs zt-metin-soluk" data-alan="onerilen-ad">
                Kullanıcı adın: <strong className="zt-metin">{onerilenAd}</strong>
                {' '}(alınmışsa sonuna sayı eklenir)
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">Doğum yılı</span>
            <input
              type="number"
              inputMode="numeric"
              value={dogumYili}
              onChange={(e) => { setDogumYili(e.target.value); setHata(null); }}
              onKeyDown={(e) => e.key === 'Enter' && basla()}
              placeholder="Örn: 2010"
              data-alan="dogum-yili"
              className="mt-1 w-full rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-base zt-metin zt-yer-tutucu zt-odak-cizgi outline-none"
            />
            <span className="mt-1 block text-xs zt-metin-soluk">
              Yalnızca yaş doğrulaması için kullanılır.
            </span>
          </label>

          {yas.tur === 'veli' && (
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border zt-odul-yuzey p-3">
              <input
                type="checkbox"
                checked={veliOnayi}
                onChange={(e) => { setVeliOnayi(e.target.checked); setHata(null); }}
                className="mt-0.5 zt-onay"
              />
              <span className="text-xs zt-metin leading-relaxed">
                <strong className="zt-odul-yazi">Veli onayı:</strong> 18 yaşından küçüğüm.
                Velim bu uygulamayı kullanmama izin veriyor ve{' '}
                <Link to="/yasal/kvkk" className="zt-vurgu-metin underline">KVKK Aydınlatma Metni</Link>'ni
                okumuştur.
              </span>
            </label>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={kosullarKabul}
              onChange={(e) => { setKosullarKabul(e.target.checked); setHata(null); }}
              data-alan="kosullar"
              className="mt-0.5 zt-onay"
            />
            <span className="text-xs zt-metin-soluk leading-relaxed">
              <Link to="/yasal/kvkk" className="zt-vurgu-metin underline">KVKK Aydınlatma Metni</Link>'ni
              okudum ve{' '}
              <Link to="/yasal/kullanim-kosullari" className="zt-vurgu-metin underline">Kullanım Koşulları</Link>'nı
              kabul ediyorum.
            </span>
          </label>

          {hata && <p className="text-sm zt-sure-metin" data-alan="giris-hata">{hata}</p>}

          <button
            onClick={basla}
            disabled={yukleniyor}
            data-alan="isimle-basla"
            className="min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin disabled:opacity-50"
          >
            {yukleniyor ? 'Başlatılıyor…' : 'Başla'}
          </button>
        </div>

        <button
          onClick={onEpostaIleGiris}
          data-alan="eposta-ile-giris"
          className="mt-6 min-h-[44px] w-full text-center text-sm font-bold zt-vurgu-metin"
        >
          Hesabın var mı? E-postayla giriş yap
        </button>

        <button onClick={onAtla} className="mt-2 min-h-[44px] w-full text-center text-sm zt-metin-soluk">
          Şimdi değil, oynamaya devam et
        </button>
      </div>
    </main>
  );
}
