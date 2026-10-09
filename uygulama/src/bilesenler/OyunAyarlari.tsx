/**
 * OyunAyarlari.tsx — Ses ve titreşim anahtarları.
 *
 * NEDEN BİR ARADA
 * İkisi de aynı soruya cevap veriyor: "oyun bana nasıl karşılık
 * versin?" Ses menünün içinde bir satırdı, titreşim gizlilik
 * ayarlarındaydı; biri diğerinden habersizdi. Aynı yerde duruyorlar.
 *
 * NEDEN AYRI BİLEŞEN
 * İki ekrandan açılıyor: oyuncunun kendi profili (istenen yer) ve
 * gizlilik ayarları. İkincisi misafir için şart — misafirin profil
 * sayfası yok (adres bir kullanıcı adı ister) ve sesi kapatma yolu
 * tamamen kapanırdı. Tek bileşen, iki kapı.
 *
 * TİTREŞİM GİZLİLİK AYARI DEĞİL
 * Hiçbir veri göndermiyor; orada durması yalnızca kapatma yeri
 * gerektiği içindi. Artık asıl evi burası.
 */

import { useState } from 'react';
import Ikon from './Ikon';
import { sesAcikMi, sesTercihiYaz } from '../depo';
import { tercihleriOku, tercihleriYaz } from '../gizlilik-tercih';
import { titret } from '../titresim';

function Satir({
  simge,
  baslik,
  aciklama,
  acik,
  onDegis,
  alan,
}: {
  simge: 'ses-acik' | 'ses-kapali' | 'titresim';
  baslik: string;
  aciklama: string;
  acik: boolean;
  onDegis: (d: boolean) => void;
  alan: string;
}) {
  return (
    <button
      onClick={() => onDegis(!acik)}
      data-alan={alan}
      aria-pressed={acik}
      // `zt-dokunma-alani` BİLEREK kullanılmadı: o sınıf display'i
      // inline-block'a çeviriyor ve satırın flex dizilişini bozuyor —
      // anahtar sağda duracakken metnin altına düşüyordu. Satır zaten
      // 44 pikselin çok üstünde.
      className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left hover:bg-slate-800/50"
    >
      <Ikon ad={simge} boyut={20} className={acik ? 'text-cyan-300' : 'text-slate-600'} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-200">{baslik}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{aciklama}</span>
      </span>
      {/* Anahtar görüntüsü: açık/kapalı tek bakışta anlaşılsın. */}
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          acik ? 'bg-cyan-300' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            acik ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function OyunAyarlari() {
  const [ses, setSes] = useState(() => sesAcikMi());
  const [titresim, setTitresim] = useState(() => tercihleriOku().titresim);

  return (
    <div className="space-y-2" data-alan="oyun-ayarlari">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Oyun ayarları
      </div>

      <Satir
        simge={ses ? 'ses-acik' : 'ses-kapali'}
        baslik="Ses"
        aciklama="Taş sesi, birleşme tonu ve geri sayım tıkırtısı."
        acik={ses}
        alan="ses-ac-kapa"
        onDegis={(d) => {
          setSes(d);
          sesTercihiYaz(d);
        }}
      />

      <Satir
        simge="titresim"
        baslik="Titreşim"
        aciklama="Taşa basınca ve tam isabette telefon kısa süre titrer."
        acik={titresim}
        alan="titresim-ac-kapa"
        onDegis={(d) => {
          setTitresim(d);
          tercihleriYaz({ ...tercihleriOku(), titresim: d });
          // Açan kişi ne açtığını hemen hissetsin.
          if (d) titret('orta');
        }}
      />
    </div>
  );
}
