/**
 * arena-istemci.ts — Arena sunucusuyla konuşan tek yer.
 *
 * Düellodaki `duello-istemci.ts` ile aynı yaklaşım: ekran doğrudan
 * `fetch` çağırmıyor, hepsi buradan geçiyor. Kimlik başlığı, zaman
 * aşımı, yeniden deneme ve Türkçe hata metinleri tek yerde duruyor.
 *
 * KURAL 2'NİN İSTEMCİ TARAFI
 * Burada puan, sıra ya da kazanan hesaplanmıyor. Hepsi sunucudan
 * geliyor; istemci yalnızca gösteriyor.
 */

import { supabase } from './supabase';

export interface ArenaYarisci {
  koltuk: number;
  ad: string;
  botMu: boolean;
  benMiyim: boolean;
  puan: number;
  ayrildi: boolean;
  /** Bu turda hedefe uzaklığı — yarışanlar hakkında bilinen TEK şey. */
  uzaklik: number | null;
}

export interface ArenaPodyumSatiri {
  koltuk: string;
  sira: number;
  puan: number;
  madalya: 'altin' | 'gumus' | 'bronz' | null;
}

export interface ArenaDurumu {
  id: string;
  /** Hangi oyunun arenası — tahtayı bu belirler. */
  oyun?: string;
  seviye: string;
  tohum: number;
  durum: 'bekliyor' | 'basladi' | 'bitti';
  benimKoltuk: number;
  aktifTur: number;
  toplamTur: number;
  turBasladi: string | null;
  turSuresiSn: number;
  olusturuldu: string;
  beklemeSn: number;
  yarisanlar: ArenaYarisci[];
  podyum: ArenaPodyumSatiri[] | null;
  turAcik: boolean;
}

/** Ağ hatasının kullanıcıya gösterilen Türkçe karşılığı. */
export const BAGLANTI_HATASI = 'Bağlantı kurulamadı. Tekrar dene.';

const ZAMAN_ASIMI_MS = 12_000;

async function cagir<T>(uc: string, govde: unknown, ikinciDeneme = false): Promise<T> {
  const { data: oturum } = await supabase.auth.getSession();
  if (!oturum.session) throw new Error('Oturumun kapanmış. Yeniden giriş yap.');

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const kesici = new AbortController();
  const zamanlayici = setTimeout(() => kesici.abort(), ZAMAN_ASIMI_MS);

  let yanit: Response;
  try {
    yanit = await fetch(`${url}/functions/v1/${uc}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oturum.session.access_token}`,
      },
      body: JSON.stringify(govde),
      signal: kesici.signal,
    });
  } catch {
    // Edge Function uyanırken ilk istek düşebiliyor; sessizce bir kez
    // daha deniyoruz, sonra Türkçe söylüyoruz.
    if (!ikinciDeneme) return cagir<T>(uc, govde, true);
    throw new Error(BAGLANTI_HATASI);
  } finally {
    clearTimeout(zamanlayici);
  }

  if (yanit.status >= 500 && !ikinciDeneme) return cagir<T>(uc, govde, true);

  let veri: { hata?: string } | null = null;
  try {
    veri = await yanit.json();
  } catch {
    veri = null;
  }
  if (!yanit.ok) {
    throw new Error(veri?.hata ?? 'Sunucuya ulaşıldı ama işlem tamamlanamadı.');
  }
  return veri as T;
}

export interface ArenaKatilim {
  macId?: string;
  koltuk?: number;
  yeniKuruldu?: boolean;
  /** `surenArenaSor` için: süren arena yok. */
  arenaYok?: boolean;
}

/** Arenaya katılır; bekleyen arena varsa ona oturur, yoksa yenisini açar. */
export function arenayaKatil(seviye: string, oyun = 'sayi'): Promise<ArenaKatilim> {
  return cagir<ArenaKatilim>('arena-ara', { seviye, oyun });
}

/**
 * Süren bir arenam var mı? Arenaya KATILMAZ.
 *
 * Ekran açılır açılmaz bu soruluyor: sekmesini yenileyen oyuncu
 * yarışına geri dönebilsin diye. Normal katılma çağrısı kullanılsaydı
 * ekrana bakmak bile oyuncuyu bir arenaya sokardı.
 */
export function surenArenaSor(seviye: string, oyun = 'sayi'): Promise<ArenaKatilim> {
  return cagir<ArenaKatilim>('arena-ara', { seviye, oyun, sadece_kontrol: true });
}

/**
 * Arenanın güncel durumunu sorar.
 *
 * Bu çağrı arenayı aynı zamanda İLERLETİR: bekleme dolduysa botlarla
 * başlatır, botların sırası geldiyse oynatır, süresi dolan turu kapatır.
 * Yani düzenli sorulması yarışın akmasını sağlıyor.
 */
export function arenaDurumOku(macId: string): Promise<ArenaDurumu> {
  return cagir<ArenaDurumu>('arena-durum', { mac_id: macId });
}

export interface ArenaGonderimSonucu {
  uzaklik: number;
  aktifTur: number;
  turBasladi: string | null;
  durum: 'bekliyor' | 'basladi' | 'bitti';
  turAcik: boolean;
  podyum: ArenaPodyumSatiri[] | null;
}

/**
 * Turdaki cevabı gönderir; uzaklığı sunucu hesaplar.
 * `cevap`ın biçimi oyuna göre değişir (bkz. duello-istemci).
 */
export function arenaGonder(
  macId: string,
  turNo: number,
  cevap: unknown,
  kilit = false,
): Promise<ArenaGonderimSonucu> {
  return cagir<ArenaGonderimSonucu>('arena-gonder', {
    mac_id: macId,
    tur_no: turNo,
    cevap,
    kilit,
  });
}

/**
 * Yarıştan çıkar.
 *
 * Düellodan farkı: çıkmak arenayı bitirmiyor, kalanlar yarışmaya devam
 * ediyor. Çıkan podyumda en sonda ve madalyasız kalıyor.
 */
export function arenaTerkEt(macId: string): Promise<{ terk?: boolean }> {
  return cagir<{ terk?: boolean }>('arena-gonder', { mac_id: macId, terk: true });
}
