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
