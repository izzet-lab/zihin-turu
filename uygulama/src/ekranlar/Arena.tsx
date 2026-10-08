import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ARENA_KOLTUK, duelloTurTohumu } from '@tamisabet/cekirdek';
import Oyun from './Oyun';
import KelimeTahtasi from './KelimeTahtasi';
import { oyunAdiCevir, useOyunSaglayici, type OyunAdi } from '../oyun-saglayici';
import { acikSeviyeler } from '../depo';
import {
  arenaDurumOku,
  arenaGonder,
  arenaTerkEt,
  arenayaKatil,
  surenArenaSor,
  type ArenaDurumu,
} from '../arena-istemci';

/**
 * Arena.tsx — 5 kişilik eşzamanlı yarış ekranı.
 *
 * Dört hâli var: seviye seçimi, oyuncu bekleme, yarış, podyum.
 *
 * NEDEN CANLI YAYIN YOK, YOKLAMA VAR
 * Düelloda rakibin uzaklığı için Realtime aboneliği kuruluyor. Arenada
 * durum çağrısı zaten her iki saniyede bir yapılmak ZORUNDA — yarışı
 * ilerleten de o çağrı (botları oynatıyor, süresi dolan turu kapatıyor).
 * Aynı veriyi bir de ayrı kanaldan dinlemek, ikinci bir doğruluk kaynağı
 * yaratmaktan başka işe yaramazdı.
 *
 * KURAL 2 — SUNUCU SÖYLER
 * Puan, sıra, podyum ve rakiplerin uzaklığı hep sunucudan geliyor. Bu
 * ekran hiçbir şey hesaplamıyor; turun bulmacasını tohumdan üretiyor
 * (sunucu da aynı tohumdan aynı bulmacayı üretiyor).
 */

const YOKLAMA_MS = 2000;

interface Props {
  seviye: string;
  /** Hangi oyunun arenası — verilmezse sayı turu. */
  oyun?: string;
  girisYapildiMi: boolean;
  onCik: () => void;
  onGirisAc: () => void;
}

export default function Arena({
  seviye: baslangicSeviyesi,
  oyun: oyunAdi,
  girisYapildiMi,
  onCik,
  onGirisAc,
}: Props) {
  const acikListe = useMemo(() => acikSeviyeler(), []);
  const [seviye, setSeviye] = useState(() =>
    // Adres satırından kilitli seviye gelebilir; arena, tek kişilik
    // ilerlemeyi atlamanın yolu olmamalı.
    acikListe.includes(baslangicSeviyesi)
      ? baslangicSeviyesi
      : (acikListe[acikListe.length - 1] ?? 'cocuk'),
  );

  const [macId, setMacId] = useState<string | null>(null);
  const [durum, setDurum] = useState<ArenaDurumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [acilisKontrolu, setAcilisKontrolu] = useState(false);
  const [cikisSoruluyor, setCikisSoruluyor] = useState(false);
  const [kilitliTur, setKilitliTur] = useState<number | null>(null);
  /** Oyuncunun kendi adım zinciri — bekleme ekranında gösteriliyor. */
  const [kilitliAdimlar, setKilitliAdimlar] = useState<
    { a: number; b: number; islem: string; sonuc: number }[]
  >([]);
  const macIdRef = useRef<string | null>(null);
  macIdRef.current = macId;
  const durumRef = useRef<ArenaDurumu | null>(null);
  durumRef.current = durum;

  /**
   * Hangi oyunun arenası. Sunucudan maç gelince onun `oyun` alanı esas
   * alınıyor — sekmesini yenileyen oyuncu doğru tahtayı bulsun.
   */
  const oyun: OyunAdi = oyunAdiCevir(durum?.oyun ?? oyunAdi);
  const saglayici = useOyunSaglayici(oyun);
  const seviyeListesi = saglayici?.seviyeler ?? [];

  const seviyeEtiket = seviyeListesi.find((s) => s.anahtar === seviye)?.etiket ?? seviye;

  /* --- Açılışta: süren arenam var mı? --- */
  useEffect(() => {
    if (!girisYapildiMi || acilisKontrolu) return;
    let durduruldu = false;
    surenArenaSor(seviye, oyun)
      .then((s) => {
        if (durduruldu) return;
        if (s.macId) setMacId(s.macId);
        setAcilisKontrolu(true);
      })
      .catch(() => {
        if (!durduruldu) setAcilisKontrolu(true);
      });
    return () => {
      durduruldu = true;
    };
  }, [girisYapildiMi, seviye, oyun, acilisKontrolu]);

  /* --- Arena sürerken durumu yokla (bu çağrı yarışı da ilerletiyor) --- */
  useEffect(() => {
    if (!macId) return;
    let durduruldu = false;

    async function yokla() {
      const id = macIdRef.current;
      if (!id) return;
      try {
        const son = await arenaDurumOku(id);
        if (durduruldu) return;
        // Tur değiştiyse kilit düşer: yeni turda tahta geri gelmeli.
        if (son.aktifTur !== durumRef.current?.aktifTur) setKilitliTur(null);
        setDurum(son);
      } catch (e) {
        if (!durduruldu) setHata((e as Error).message);
      }
    }

    yokla();
    const z = setInterval(yokla, YOKLAMA_MS);
    return () => {
      durduruldu = true;
      clearInterval(z);
    };
  }, [macId]);

  /* --- Turun bulmacası: sunucuyla aynı tohumdan --- */
  const tur = useMemo(() => {
    if (!durum || durum.durum !== 'basladi' || !saglayici) return null;
    return saglayici.turUret(durum.seviye, duelloTurTohumu(Number(durum.tohum), durum.aktifTur));
  }, [saglayici, durum?.tohum, durum?.aktifTur, durum?.seviye, durum?.durum]);

  /**
   * Çubukların ortak cetveli.
   *
   * ESKİDEN TURUN HEDEFİYDİ — ama "hedef" sayı turuna özgü bir kelime
   * ve platform onu bilmemeli (kural 1). Artık cetvel bu turda görülen
   * en büyük uzaklık: kimse ilerlemediyse çubuklar boş, biri
   * yaklaştıkça aradaki fark görünür.
   */
  const arenaHedef = Math.max(
    1,
    ...(durum?.yarisanlar ?? []).map((y) => y.uzaklik ?? 0),
  );
  const benimUzaklik =
    durum?.yarisanlar.find((y) => y.benMiyim)?.uzaklik ?? null;

  /** Uzaklığı çubuk yüzdesine çevirir: hedefe yaklaştıkça dolu. */
  const cubukYuzdesi = useCallback(
    (u: number | null) => {
      if (u == null) return 0;
      const olcek = Math.max(arenaHedef, 1);
      return Math.max(4, Math.round((1 - Math.min(u, olcek) / olcek) * 100));
    },
    [arenaHedef],
  );

  /**
   * Bu turun bir çözümü — sunucudan GELMİYOR, tohumdan burada
   * üretiliyor. Yalnızca cevabını kilitlemiş oyuncuya gösteriliyor.
   */
  const turCozumu = useMemo(() => {
    if (!tur || kilitliTur !== durum?.aktifTur) return null;
    try {
      return saglayici?.cozumBul(tur, 400) ?? null;
    } catch {
      return null;
    }
  }, [saglayici, tur, kilitliTur, durum?.aktifTur]);

  const katil = useCallback(async () => {
    try {
      const sonuc = await arenayaKatil(seviye, oyun);
      if (sonuc.macId) setMacId(sonuc.macId);
    } catch (e) {
      setHata((e as Error).message);
    }
  }, [seviye, oyun]);

  const ilerlemeGonder = useCallback(
    /** `cevap`ın biçimini arena bilmez: sayıda zincir, kelimede sözcük. */
    (cevap: unknown, kilit = false) => {
      const id = macIdRef.current;
      const d = durumRef.current;
      if (!id || !d || d.durum !== 'basladi') return;
      if (kilit) {
        setKilitliTur(d.aktifTur);
        setKilitliAdimlar(
          Array.isArray(cevap)
            ? (cevap as { a: number; b: number; islem: string; sonuc: number }[])
            : [],
        );
      }
      arenaGonder(id, d.aktifTur, cevap, kilit).catch((e) => {
        // Tur bu arada kapanmış olabilir — arıza değil, oyunun akışı.
        const mesaj = (e as Error).message;
        if (mesaj.includes('oynanmıyor') || mesaj.includes('çıkmışsın')) return;
        setHata(mesaj);
      });
    },
    [],
  );

  const yaristanCik = useCallback(async () => {
    const id = macIdRef.current;
    if (id) {
      try {
        await arenaTerkEt(id);
      } catch {
        /* arena bu arada bitmiş olabilir; sorun değil */
      }
    }
    setCikisSoruluyor(false);
    setMacId(null);
    setDurum(null);
    setKilitliTur(null);
  }, []);

  /* --- Ekranlar --- */

  if (!girisYapildiMi) {
    return (
      <Cerceve baslik="Arena">
        <p className="text-sm text-slate-400">
          Arena için üye olman gerekiyor — yarıştığın kişiler ve sıralaman hesabına bağlı.
        </p>
        <button
          onClick={onGirisAc}
          data-alan="arena-giris"
          className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Üye ol / giriş yap
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (hata) {
    return (
      <Cerceve baslik="Bir şey ters gitti">
        <p className="text-sm text-amber-300" data-alan="arena-hata">
          {hata}
        </p>
        <button
          onClick={() => {
            setHata(null);
            setAcilisKontrolu(false);
          }}
          data-alan="arena-tekrar-dene"
          className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Tekrar dene
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  // Seviye seçimi — önce seviye, sonra yarış (düellodaki sıranın aynısı).
  if (!macId && acilisKontrolu) {
    return (
      <Cerceve baslik="Arena">
        <p className="text-sm text-slate-400">
          Beş kişi, aynı anda, beş tur. Tam isabeti ilk bulan turu alır.
        </p>

        <div className="mt-5 text-left">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            Seviye
          </div>
          <div className="grid grid-cols-2 gap-2.5" data-alan="arena-seviyeler">
            {seviyeListesi.map((sv) => {
              const kilitli = !acikListe.includes(sv.anahtar);
              const secili = seviye === sv.anahtar;
              return (
                <button
                  key={sv.anahtar}
                  data-seviye={sv.anahtar}
                  disabled={kilitli}
                  onClick={() => setSeviye(sv.anahtar)}
                  aria-pressed={secili}
                  className={`min-h-[56px] rounded-xl border-2 px-3 py-2 text-left transition ${
                    kilitli
                      ? 'border-slate-800 bg-slate-900/40 text-slate-600'
                      : secili
                        ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                        : 'border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="block text-sm font-black">
                    {kilitli && '🔒 '}
                    {sv.etiket}
                  </span>
                  <span className="block text-[11px] opacity-70">{sv.altEtiket}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={katil}
          data-alan="arena-katil"
          className="mt-5 min-h-[56px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Arenaya katıl
        </button>
        <p className="mt-2 text-xs text-slate-600">
          {seviyeEtiket} seviyesinde. Boş koltuklar kısa sürede dolar.
        </p>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (!durum) {
    return (
      <Cerceve baslik="Arena hazırlanıyor">
        <p className="text-sm text-slate-400" data-alan="arena-hazirlaniyor">
          Yarış kuruluyor…
        </p>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  /* --- Bekleme: oyuncular toplanıyor --- */
  if (durum.durum === 'bekliyor') {
    const dolu = durum.yarisanlar.length;
    return (
      <Cerceve baslik="Yarışçılar bekleniyor">
        <p className="text-sm text-slate-400" data-alan="arena-bekleme">
          {dolu}/{ARENA_KOLTUK} koltuk doldu. Boş kalanlara rakip atanacak.
        </p>
        <div className="mt-5 space-y-2 text-left">
          {Array.from({ length: ARENA_KOLTUK }).map((_, i) => {
            const y = durum.yarisanlar[i];
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  y ? 'border-slate-700 bg-slate-900/60' : 'border-dashed border-slate-800'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    y?.benMiyim ? 'bg-cyan-300/25 text-cyan-100' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {y ? y.ad.trim().charAt(0).toLocaleUpperCase('tr') : '·'}
                </span>
                <span className={`text-sm ${y ? 'text-slate-200' : 'text-slate-600'}`}>
                  {y ? (y.benMiyim ? 'Sen' : y.ad) : 'bekleniyor…'}
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={yaristanCik}
          data-alan="arena-bekleme-cik"
          className="zt-dokunma-alani mt-6 w-full text-sm font-bold text-slate-400 hover:text-slate-200"
        >
          Vazgeç
        </button>
      </Cerceve>
    );
  }

  /* --- Podyum --- */
  if (durum.durum === 'bitti') {
    const benimSira = durum.podyum?.find(
      (p) => Number(p.koltuk) === durum.benimKoltuk,
    );
    const adBul = (koltuk: string) =>
      durum.yarisanlar.find((y) => y.koltuk === Number(koltuk));
    const nisan = { altin: '🥇', gumus: '🥈', bronz: '🥉' } as const;

    return (
      <Cerceve baslik="Arena bitti">
        {/* PODYUM — birinci yüksekte durur. Sıralamayı listeyle
            anlatmak mümkün ama podyum bir oyunun görüntüsü. */}
        {(durum.podyum?.length ?? 0) >= 3 && (
          <div className="mb-6 flex items-end justify-center gap-2" aria-hidden="true">
            {[1, 0, 2].map((i) => {
              const p = durum.podyum![i];
              if (!p) return null;
              const y = adBul(p.koltuk);
              const benim = Number(p.koltuk) === durum.benimKoltuk;
              const yukseklik = ['h-24', 'h-16', 'h-12'][i]!;
              return (
                <div key={p.koltuk} className="flex w-1/4 flex-col items-center">
                  <span className="text-2xl">{p.madalya ? nisan[p.madalya] : ''}</span>
                  <span
                    className={`mt-1 w-full truncate text-center text-[11px] font-bold ${
                      benim ? 'text-cyan-200' : 'text-slate-400'
                    }`}
                  >
                    {benim ? 'Sen' : (y?.ad ?? '—')}
                  </span>
                  <div
                    className={`zt-basamak mt-1 w-full rounded-t-lg border-x border-t ${yukseklik} ${
                      benim
                        ? 'border-cyan-300/40 bg-cyan-300/15'
                        : 'border-slate-700 bg-slate-800/60'
                    }`}
                  >
                    <div className="zt-rakam pt-1 text-center text-sm font-black text-slate-300">
                      {p.sira}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {benimSira && (
          <div
            className={`zt-sahne rounded-2xl border px-5 py-5 ${
              benimSira.madalya
                ? 'border-cyan-300/40 bg-cyan-300/10'
                : 'border-slate-700 bg-slate-900/60'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Senin sıran
            </div>
            <div
              className="zt-rakam mt-1 text-5xl font-black leading-none text-cyan-200"
              data-alan="arena-sonuc"
            >
              {benimSira.sira}.
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {benimSira.puan} puan
              {benimSira.madalya ? ` · ${nisan[benimSira.madalya]}` : ''}
            </div>
          </div>
        )}

        <ul
          className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40 text-left"
          data-alan="arena-podyum"
        >
          {(durum.podyum ?? []).map((p) => {
            const y = adBul(p.koltuk);
            const benim = Number(p.koltuk) === durum.benimKoltuk;
            return (
              <li
                key={p.koltuk}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                  benim ? 'bg-cyan-300/10' : ''
                }`}
              >
                <span className="w-7 shrink-0 text-center font-bold text-slate-500">
                  {p.madalya ? nisan[p.madalya] : p.sira}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-bold ${
                    benim ? 'text-cyan-200' : 'text-slate-300'
                  }`}
                >
                  {benim ? 'Sen' : (y?.ad ?? 'Yarışçı')}
                  {y?.ayrildi && <span className="ml-1 text-xs text-slate-600">(çıktı)</span>}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-cyan-300">
                  {p.puan} puan
                </span>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => {
            setMacId(null);
            setDurum(null);
            setKilitliTur(null);
          }}
          data-alan="arena-yeni"
          className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Yeni arena
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  /* --- Çıkış onayı --- */
  if (cikisSoruluyor) {
    return (
      <Cerceve baslik="Yarıştan çıkılsın mı?">
        <p className="text-sm text-slate-400">
          Çıkarsan podyumda en sona yazılırsın; yarış kalanlarla sürer.
        </p>
        <button
          onClick={yaristanCik}
          data-alan="arena-terk-onay"
          className="mt-5 min-h-[52px] w-full rounded-xl border border-amber-400/40 text-base font-bold text-amber-300 hover:bg-amber-400/10"
        >
          Evet, çık
        </button>
        <button
          onClick={() => setCikisSoruluyor(false)}
          data-alan="arena-terk-vazgec"
          className="mt-3 min-h-[48px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Yarışa dön
        </button>
      </Cerceve>
    );
  }

  /* --- Cevap kilitlendi, tur kapanması bekleniyor --- */
  if (kilitliTur === durum.aktifTur) {
    return (
      <Cerceve baslik={`Tur ${durum.aktifTur}/${durum.toplamTur}`}>
        {/* SAHNE — kilitlenen cevap, oyunun diliyle. Önce bu ekran düz
            metin satırlarıydı ve bildirim gibi duruyordu. */}
        <div
          className="zt-sahne rounded-2xl border border-cyan-300/30 bg-cyan-300/5 px-5 py-6"
          data-alan="arena-kilit-bekleme"
        >
          <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300/70">
            Cevabın kilitlendi
          </div>
          <div className="zt-rakam mt-1 text-5xl font-black leading-none text-cyan-200">
            {benimUzaklik === 0 ? 'TAM' : (benimUzaklik ?? '—')}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {benimUzaklik === 0
              ? 'hedefi tam tutturdun 🎯'
              : kilitliAdimlar.length === 0
                ? 'hiç işlem yapmadın'
                : `fark · hedef ${arenaHedef}`}
          </div>
          <div className="zt-nabiz mt-4 text-xs font-bold text-slate-400">
            Diğerleri oynuyor…
          </div>
        </div>

        {/* BEŞ ÇUBUK — kim hedefe yakın, bakışta görünsün. */}
        <ul className="mt-4 space-y-2.5 text-left">
          {[...durum.yarisanlar]
            .sort((a, b) => {
              if (a.ayrildi !== b.ayrildi) return a.ayrildi ? 1 : -1;
              return (a.uzaklik ?? Infinity) - (b.uzaklik ?? Infinity);
            })
            .map((y) => (
              <li key={y.koltuk} className={y.ayrildi ? 'opacity-40' : ''}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className={y.benMiyim ? 'font-bold text-cyan-200' : 'text-slate-400'}>
                    {y.benMiyim ? 'Sen' : y.ad}
                  </span>
                  <span className="font-bold text-slate-300">
                    {y.ayrildi
                      ? 'çıktı'
                      : y.uzaklik == null
                        ? 'henüz yok'
                        : y.uzaklik === 0
                          ? 'tam isabet 🎯'
                          : `${y.uzaklik} fark`}
                  </span>
                </div>
                <div className="zt-cubuk mt-1 h-2 w-full">
                  <div
                    className={`zt-cubuk-dolgu ${
                      y.uzaklik === 0 ? 'zt-tam' : y.benMiyim ? '' : 'zt-rakip'
                    }`}
                    style={{ width: `${cubukYuzdesi(y.uzaklik)}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>

        {/* SENİN YOLUN — tahtaya el yazısıyla. */}
        {kilitliAdimlar.length > 0 && (
          <div className="mt-5 text-left" data-alan="arena-kilit-zincir">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Senin yolun
            </div>
            <div className="zt-sahne rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <ul className="elyazisi space-y-1.5 text-lg text-cyan-100">
                {kilitliAdimlar.map((ad, i) => (
                  <li key={i} className="tahta-satir" style={{ animationDelay: `${i * 180}ms` }}>
                    {ad.a} {ad.islem} {ad.b} = {ad.sonuc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* BU TURUN BİR ÇÖZÜMÜ — cevabını kilitleyen oyuncu artık bu
            turda bir şey değiştiremez; beklerken doğru yolu görmesi
            oyunu öğretiyor. Sunucudan gelmiyor, tohumdan üretiliyor. */}
        {turCozumu && turCozumu.satirlar.length > 0 && (
          <div className="mt-5 text-left" data-alan="arena-kilit-cozum">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Bu turun bir çözümü
            </div>
            <div className="zt-sahne rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
              <ul className="elyazisi space-y-1.5 text-lg text-amber-100">
                {turCozumu.satirlar.map((satir, i) => (
                  <li key={i} className="tahta-satir" style={{ animationDelay: `${i * 180}ms` }}>
                    {satir}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600">Tek yol değil.</p>
          </div>
        )}
        <button
          onClick={() => setCikisSoruluyor(true)}
          data-alan="arena-terk"
          className="zt-dokunma-alani mt-6 w-full text-xs font-bold text-slate-600 hover:text-slate-400"
        >
          Yarıştan çık
        </button>
      </Cerceve>
    );
  }

  if (!saglayici) {
    return (
      <Cerceve baslik="Arena">
        <p className="zt-nabiz text-sm text-slate-400">Sözlük hazırlanıyor…</p>
      </Cerceve>
    );
  }

  if (!tur) return null;

  const gecenSn = durum.turBasladi
    ? Math.max(0, (Date.now() - Date.parse(durum.turBasladi)) / 1000)
    : 0;
  const kalanSn = Math.max(1, Math.round(durum.turSuresiSn - gecenSn));

  const arenaUstBilgi = {
    turNo: durum.aktifTur,
    toplamTur: durum.toplamTur,
    yarisanlar: durum.yarisanlar,
    onIlerleme: ilerlemeGonder,
    onCik: () => setCikisSoruluyor(true),
  };

  // KELİME ARENASI: tahta bambaşka, üstü aynı.
  if (oyun === 'kelime') {
    return (
      <KelimeTahtasi
        key={`${durum.id}-${durum.aktifTur}`}
        saglayici={saglayici}
        tur={tur}
        kalan={kalanSn}
        toplamSure={durum.turSuresiSn}
        arena={arenaUstBilgi}
        onIlerleme={(cevap, kilit) => ilerlemeGonder(cevap.icerik, kilit)}
        onCik={() => setCikisSoruluyor(true)}
      />
    );
  }

  return (
    <Oyun
      // Tur değişince tahta sıfırdan kurulur.
      key={`${durum.id}-${durum.aktifTur}`}
      tur={tur}
      seviye={durum.seviye}
      sure={kalanSn}
      mod="antrenman"
      oturumPuan={null}
      arena={{
        turNo: durum.aktifTur,
        toplamTur: durum.toplamTur,
        yarisanlar: durum.yarisanlar,
        onIlerleme: ilerlemeGonder,
        onCik: () => setCikisSoruluyor(true),
      }}
      // "Cevabı kilitle": tur senin bitirmenle kapanmaz, herkes cevabını
      // verince ya da süre dolunca kapanır.
      onBitti={(s) => ilerlemeGonder(s.adimlar, true)}
    />
  );
}

function Cerceve({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-[#0A0E1A] px-5 pb-6 pt-16 text-slate-200">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-black text-white">{baslik}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}

function GeriDugmesi({ onCik }: { onCik: () => void }) {
  return (
    <button
      onClick={onCik}
      data-alan="arena-cik"
      className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-400 hover:text-slate-200"
    >
      Vazgeç
    </button>
  );
}
