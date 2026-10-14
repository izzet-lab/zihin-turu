/**
 * KelimeTahtasi.tsx — Kelime turunun düello ve arena tahtası.
 *
 * NEDEN AYRI DOSYA
 * `Oyun.tsx` sayı turunun tahtası: taşlar, işlem tuşları, zincir.
 * Kelime turunun tahtası bambaşka. Ortak olan kısım — tur sayacı,
 * rakip kartı, yarışçı listesi, süre çubuğu — `YarisUstBilgi`'ye
 * çıkarıldı ve ikisi de onu kullanıyor.
 *
 * TEK KİŞİLİK KELİME EKRANINDAN FARKI
 * `KelimeTuru.tsx` kendi turunu kendi üretiyor ve puanı kendi
 * gösteriyor. Burada tur dışarıdan geliyor (maçın tohumundan),
 * puanı sunucu veriyor ve "Bitir" turu kapatmıyor — cevabı KİLİTLİYOR.
 *
 * KURAL 8
 * Rakipten gelen tek bilgi uzaklık. Oyuncunun seçtiği harfler
 * dışarıya hiç gitmiyor; yalnızca kendi uzaklığı bildiriliyor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Cevap, Tur, TurSaglayici } from '@tamisabet/cekirdek';
import { turkceBuyult } from '@tamisabet/oyun-kelime';
import { titret } from '../titresim';
import Parcaciklar from '../bilesenler/Parcaciklar';
import YarisUstBilgi, {
  SureCubugu,
  type ArenaUstBilgi,
  type DuelloUstBilgi,
} from '../bilesenler/YarisUstBilgi';

interface Tas {
  id: number;
  harf: string;
}

interface Props {
  saglayici: TurSaglayici;
  tur: Tur;
  /** Kalan saniye — maçı sunucu yönetiyor, sayaç dışarıdan geliyor. */
  kalan: number;
  toplamSure: number;
  duello?: DuelloUstBilgi | null;
  arena?: ArenaUstBilgi | null;
  /** Oyuncu hedefe yaklaştıkça çağrılır; sunucuya bildirim buradan gider. */
  onIlerleme: (cevap: Cevap, kilit?: boolean) => void;
  onCik?: () => void;
}

export default function KelimeTahtasi({
  saglayici,
  tur,
  kalan,
  toplamSure,
  duello,
  arena,
  onIlerleme,
  onCik,
}: Props) {
  const harfler = useMemo(() => (tur.veri as { harfler: string[] }).harfler, [tur]);
  const taslar: Tas[] = useMemo(() => harfler.map((h, i) => ({ id: i, harf: h })), [harfler]);

  const [secilenler, setSecilenler] = useState<number[]>([]);
  const [uyari, setUyari] = useState<string | null>(null);

  // Tur değişince tahta sıfırlanır.
  useEffect(() => {
    setSecilenler([]);
    setUyari(null);
  }, [tur]);

  const yazilan = secilenler.map((id) => taslar[id]?.harf ?? '').join('');

  /**
   * Her geçerli kelimede uzaklık bildiriliyor — rakip "ne kadar yakın"
   * olduğumu görsün diye. Geçersiz kelime bildirilmiyor: rakibe
   * yanıltıcı bir ilerleme göstermemek için.
   */
  const bildirilenRef = useRef<string>('');
  useEffect(() => {
    if (!yazilan || yazilan === bildirilenRef.current) return;
    const d = saglayici.dogrula(tur, { icerik: yazilan });
    if (!d.gecerli) return;
    bildirilenRef.current = yazilan;
    onIlerleme({ icerik: yazilan });
  }, [yazilan, saglayici, tur, onIlerleme]);

  const harfTikla = (id: number) => {
    setUyari(null);
    titret('hafif');
    setSecilenler((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const kilitle = useCallback(() => {
    const d = saglayici.dogrula(tur, { icerik: yazilan });
    if (!d.gecerli) {
      // Geçersiz cevap turu kilitlemez; oyuncu düzeltebilsin.
      setUyari(d.hata ?? 'Bu cevap kabul edilmedi.');
      titret('kayip');
      return;
    }
    // Uzaklık sıfırsa en uzun kelime bulundu: tam isabet.
    titret(d.uzaklik === 0 ? 'basari' : 'orta');
    onIlerleme({ icerik: yazilan }, true);
  }, [saglayici, tur, yazilan, onIlerleme]);

  return (
    <main className="zt-ekran min-h-dvh zt-kagit px-5 pb-6 pt-16 zt-metin">
      <Parcaciklar />
      {/* relative z-10: parçacık katmanının üstünde. */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col">
        <YarisUstBilgi duello={duello} arena={arena} />
        <SureCubugu kalan={kalan} toplamSure={toplamSure} />

        {/* Yazılan kelime */}
        <div
          className="zt-sahne mt-5 flex min-h-[84px] items-center justify-center rounded-2xl border zt-cizgi zt-yuzey px-4"
          data-alan="kelime-yazilan"
        >
          {yazilan ? (
            <span className="zt-rakam break-all text-center text-3xl font-black leading-none zt-vurgu-metin">
              {turkceBuyult(yazilan)}
            </span>
          ) : (
            <span className="text-sm zt-metin-soluk">Harflere dokunarak kelime kur</span>
          )}
        </div>

        {uyari && (
          <div className="mt-2 text-center text-xs font-bold zt-odul-yazi" data-alan="kelime-uyari">
            {uyari}
          </div>
        )}

        {/* Harf rafı */}
        <div className="mt-6 grid grid-cols-4 gap-2.5" data-alan="kelime-raf">
          {taslar.map((t, sira) => {
            // Kelimeye girmiş harf TÜKENMİŞTİR: raftan silinmiyor ama
            // soluklaşıp geri çekiliyor (bkz. [data-kullanilmis]).
            const secili = secilenler.includes(t.id);
            return (
              <button
                key={t.id}
                data-harf={t.harf}
                data-kullanilmis={secili ? '1' : undefined}
                aria-pressed={secili}
                onClick={() => harfTikla(t.id)}
                // Yeni turda harfler sırayla düşsün.
                style={{ ['--zt-sira' as string]: String(sira) }}
                // Taşın yüzeyi ve harf rengi `[data-harf]` kuralında
                // sabit; buraya tema sınıfı yazılmaz (bkz. Oyun.tsx).
                className={`zt-dusen min-h-[76px] rounded-xl border px-2 text-2xl font-black uppercase leading-none ${
                  secili ? 'zt-vurgu-cizgi' : 'border-transparent'
                }`}
              >
                {turkceBuyult(t.harf)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              setUyari(null);
              setSecilenler((s) => s.slice(0, -1));
            }}
            disabled={secilenler.length === 0}
            className="min-h-[52px] rounded-xl border zt-cizgi zt-yuzey-2 font-bold zt-metin disabled:opacity-40"
            data-alan="kelime-sil"
          >
            ← Sil
          </button>
          <button
            onClick={() => {
              setUyari(null);
              setSecilenler([]);
            }}
            disabled={secilenler.length === 0}
            className="min-h-[52px] rounded-xl border zt-cizgi zt-yuzey-2 font-bold zt-metin disabled:opacity-40"
            data-alan="kelime-temizle"
          >
            Temizle
          </button>
        </div>

        <button
          onClick={kilitle}
          className="mt-3 min-h-[56px] w-full rounded-xl zt-dugme text-lg font-black zt-metin transition active:scale-[0.99]"
          data-alan="kelime-bitir"
        >
          Cevabı kilitle
        </button>

        {onCik && (
          <button
            onClick={onCik}
            data-alan={arena ? 'arena-terk' : 'duello-terk'}
            className="zt-dokunma-alani mt-4 min-h-[44px] w-full text-sm font-bold zt-metin-soluk"
          >
            Yarıştan çık
          </button>
        )}
      </div>
    </main>
  );
}
