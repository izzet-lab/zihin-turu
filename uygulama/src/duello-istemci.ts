/**
 * duello-istemci.ts — Düello sunucusuyla konuşan tek yer.
 *
 * Ekran doğrudan `fetch` çağırmıyor; hepsi buradan geçiyor. Böylece
 * kimlik başlığı, adres kurulumu ve hata biçimi tek yerde duruyor.
 *
 * KURAL 2'NİN İSTEMCİ TARAFI
 * Buradaki hiçbir fonksiyon puan, skor ya da kazanan hesaplamıyor.
 * Hepsi sunucudan geliyor; istemci yalnızca gösteriyor.
 */

import { supabase } from './supabase';

export interface DuelloMac {
  id: string;
  seviye: string;
  tohum: number;
  benTarafim: 'a' | 'b';
  aktifTur: number;
  turBasladi: string;
  turSuresiSn?: number;
  skorA: number;
  skorB: number;
  durum: string;
  kazanan?: string | null;
  botMu: boolean;
  botAd?: string | null;
  /** Rakip hakkında bilinen TEK şey (kural 8). */
  rakipUzaklik?: number | null;
  turAcik?: boolean;
}

export interface AramaSonucu {
  mac?: DuelloMac;
  bekliyor?: boolean;
  bekleyenSn?: number;
  /** `surenMaciSor` için: süren maç yok. */
  macYok?: boolean;
}

async function cagir<T>(uc: string, govde: unknown): Promise<T> {
  const { data: oturum } = await supabase.auth.getSession();
  if (!oturum.session) throw new Error('Giriş yapılmamış.');

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const yanit = await fetch(`${url}/functions/v1/${uc}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${oturum.session.access_token}`,
    },
    body: JSON.stringify(govde),
  });

  const veri = await yanit.json();
  if (!yanit.ok) throw new Error(veri?.hata ?? 'Sunucu hatası.');
  return veri as T;
}

/** Rakip arar. Bulunursa maç, bulunmazsa "bekliyor" döner. */
export function duelloAra(seviye: string): Promise<AramaSonucu> {
  return cagir<AramaSonucu>('duello-ara', { seviye });
}

/**
 * Süren bir maçım var mı? Kuyruğa YAZMAZ.
 *
 * Düello ekranı açılır açılmaz bunu soruyor: sekmesini yenileyen ya da
 * uygulamayı kapatıp açan oyuncu maçına geri dönebilsin diye. Normal
 * arama çağrısı kullanılsaydı ekrana bakmak bile oyuncuyu kuyruğa
 * sokardı.
 */
export function surenMaciSor(seviye: string): Promise<AramaSonucu> {
  return cagir<AramaSonucu>('duello-ara', { seviye, sadece_kontrol: true });
}

/**
 * Maçın güncel durumunu sorar.
 *
 * Bu çağrı maçı aynı zamanda İLERLETİR: botun sırası geldiyse oynatır,
 * süresi dolan turu kapatır. Yani düzenli sorulması maçın akmasını
 * sağlıyor.
 */
export function duelloDurumOku(macId: string): Promise<DuelloMac> {
  return cagir<DuelloMac>('duello-durum', { mac_id: macId });
}

export interface GonderimSonucu {
  uzaklik: number;
  skorA: number;
  skorB: number;
  aktifTur: number;
  turBasladi: string;
  turAcik: boolean;
  turKazanani: string | null;
  durum: string;
  kazanan: string | null;
}

/** Turdaki zinciri sunucuya gönderir; uzaklığı sunucu hesaplar. */
export function duelloGonder(
  macId: string,
  turNo: number,
  adimlar: { a: number; b: number; islem: string; sonuc: number }[],
): Promise<GonderimSonucu> {
  return cagir<GonderimSonucu>('duello-gonder', {
    mac_id: macId,
    tur_no: turNo,
    adimlar,
  });
}

/**
 * Rakibin uzaklığını canlı dinler.
 *
 * Sunucu rakibin uzaklığını `duello_tur` tablosuna yazıyor; tablo
 * Realtime yayınında ve satır güvenliği maçın taraflarıyla sınırlı.
 * Yani dışarıdan dinlenemiyor.
 *
 * Dinlenen tek alan uzaklık. Adım, zincir ya da taş bu tabloda hiç yok
 * (kural 8) — sızacak bir şey yok.
 */
export function rakibiDinle(
  macId: string,
  rakipTaraf: 'a' | 'b',
  aktarma: (uzaklik: number, turNo: number) => void,
): () => void {
  const kanal = supabase
    .channel(`duello:${macId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duello_tur',
        filter: `mac_id=eq.${macId}`,
      },
      (olay: { new?: Record<string, unknown> }) => {
        const satir = olay.new;
        if (!satir) return;
        if (satir.taraf !== rakipTaraf) return;
        if (typeof satir.uzaklik !== 'number') return;
        aktarma(satir.uzaklik, Number(satir.tur_no));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(kanal);
  };
}

/* ------------------------------------------------------------------ */
/* Rövanş ve özel oda                                                  */
/* ------------------------------------------------------------------ */

/** Biten maçtan rövanş açar; rakip zaten açtıysa onun maçına katılır. */
export function duelloRevans(macId: string): Promise<{ mac: DuelloMac }> {
  return cagir<{ mac: DuelloMac }>('duello-davet', { eylem: 'revans', mac_id: macId });
}

/** Özel oda kurar; dönen kod arkadaşa verilir. */
export function odaKur(seviye: string): Promise<{ kod: string; seviye: string }> {
  return cagir<{ kod: string; seviye: string }>('duello-davet', {
    eylem: 'oda-kur',
    seviye,
  });
}

/** Kodla odaya katılır ve maçı başlatır. */
export function odayaKatil(kod: string): Promise<{ mac: DuelloMac }> {
  return cagir<{ mac: DuelloMac }>('duello-davet', { eylem: 'oda-katil', kod });
}

/** Oda kuran taraf arkadaşını beklerken bunu sorar. */
export function odaDurumu(kod: string): Promise<{ bekliyor?: boolean; mac?: DuelloMac }> {
  return cagir<{ bekliyor?: boolean; mac?: DuelloMac }>('duello-davet', {
    eylem: 'oda-durum',
    kod,
  });
}

/**
 * Maçı terk eder — terk eden kaybeder, maç düzgün sonlanır.
 *
 * Bağlantı koptuğunda turlar zaten süreyle kapanıp maçı bitiriyor; bu
 * ise oyuncunun bilerek çıkması. İkisi de aynı yere varıyor: yarım
 * kalmış maç kalmıyor.
 */
export function duelloTerkEt(macId: string): Promise<{ terk?: boolean; zatenBitti?: boolean }> {
  return cagir<{ terk?: boolean; zatenBitti?: boolean }>('duello-davet', {
    eylem: 'terk',
    mac_id: macId,
  });
}
