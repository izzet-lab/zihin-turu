/**
 * Yönetim paneli istemcisi — göç 019'daki fonksiyonları çağırır.
 *
 * Yetki burada DENETLENMİYOR, sunucuda denetleniyor: her fonksiyon önce
 * çağıranın `yonetici` tablosunda olup olmadığına bakıyor. Bu dosyadaki
 * `yoneticiMi` yalnızca hangi ekranın gösterileceğini seçmek için.
 */

import { supabase } from './supabase';
import type { GirisSistemi } from './kimlik';

export interface YonetimOzet {
  giris_sistemi: GirisSistemi | null;
  oyuncu: number;
  isimle: number;
  dogrulanmis: number;
  bugun_yeni: number;
  bugun_tur: number;
  toplam_tur: number;
  bugun_duello: number;
}

export interface YonetimOyuncu {
  kullanici_adi: string;
  gorunen_ad: string | null;
  olusturuldu: string;
  dogrulanmis: boolean;
  tur_sayisi: number;
  son_tur: string | null;
}

export async function yoneticiMi(): Promise<boolean> {
  const { data, error } = await supabase.rpc('yonetici_mi');
  return !error && data === true;
}

export async function ozetOku(): Promise<YonetimOzet | null> {
  const { data, error } = await supabase.rpc('yonetim_ozet');
  if (error) return null;
  return data as YonetimOzet;
}

export async function oyunculariOku(adet = 50): Promise<YonetimOyuncu[]> {
  const { data, error } = await supabase.rpc('yonetim_oyuncular', { adet });
  if (error) return [];
  return (data ?? []) as YonetimOyuncu[];
}

/** Giriş sistemini değiştirir. Başarılıysa null, değilse hata metni. */
export async function girisSistemiYaz(sistem: GirisSistemi): Promise<string | null> {
  const { error } = await supabase.rpc('yonetim_giris_sistemi_yaz', { sistem });
  if (!error) return null;
  if (error.code === '42501') return 'Bu işlem için yetkin yok.';
  return 'Kaydedilemedi: ' + error.message;
}
