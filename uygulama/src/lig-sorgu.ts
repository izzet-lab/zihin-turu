/**
 * lig-sorgu.ts — Lig tabloları için Supabase sorgu yardımcıları.
 * Tüm lig sorguları bu dosyada toplanır; ekranlar doğrudan supabase çağrısı yapmaz.
 */

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Dönem anahtar hesaplama (PostgreSQL'deki to_char ile birebir uyuşmalı)
// ---------------------------------------------------------------------------

/** ISO hafta anahtarı: '2026-W34' — Pazartesi başlar, ilk hafta Perşembe içerir. */
export function haftalikAnahtar(tarih = new Date()): string {
  const d = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
  const gun = d.getUTCDay() || 7; // Pazar = 7
  d.setUTCDate(d.getUTCDate() + 4 - gun); // Perşembeye getir (ISO haftanın referansı)
  const yilBasi = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const haftaNo = Math.ceil(((d.getTime() - yilBasi.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(haftaNo).padStart(2, '0')}`;
}

/** Ay anahtarı: '2026-08' */
export function aylikAnahtar(tarih = new Date()): string {
  const y = tarih.getUTCFullYear();
  const m = String(tarih.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Dönem bitimine kalan saniye. */
export function donemKalanSn(sekme: 'gunluk' | 'haftalik' | 'aylik'): number {
  const simdi = new Date();
  let bitis: Date;
  if (sekme === 'gunluk') {
    bitis = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate() + 1));
  } else if (sekme === 'haftalik') {
    // Gelecek Pazartesi gece yarısı
    const gun = simdi.getUTCDay() || 7;
    const kalanGun = 8 - gun;
    bitis = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate() + kalanGun));
  } else {
    // Ayın son günü gece yarısı
    bitis = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth() + 1, 1));
  }
  return Math.max(0, Math.floor((bitis.getTime() - simdi.getTime()) / 1000));
}

/** Okunabilir kalan süre: "3 saat 12 dk" gibi. */
export function kalanSureMetin(saniye: number): string {
  if (saniye <= 0) return 'Sona erdi';
  const saat = Math.floor(saniye / 3600);
  const dk = Math.floor((saniye % 3600) / 60);
  if (saat >= 24) return `${Math.floor(saat / 24)} gün`;
  if (saat > 0) return `${saat} saat ${dk} dk`;
  return `${dk} dk`;
}

// ---------------------------------------------------------------------------
// Lig sıralama tipleri
// ---------------------------------------------------------------------------

export interface LigSatiri {
  sira: number;
  kullaniciAdi: string;
  puan: number;
  gunSayisi?: number; // dönem sıralamalarında var
  benimMi: boolean;
}

export interface KendiDurumu {
  sira: number;
  puan: number;
}

// ---------------------------------------------------------------------------
// Günlük lig sorgular
// ---------------------------------------------------------------------------

/** Bugünkü günlük lig ilk 100 ve kendi sıra. */
export async function gunlukLig(
  oyun: string,
  seviye: string,
  tarih: string,          // 'YYYY-MM-DD'
  oyuncuId?: string,
): Promise<{ satirlar: LigSatiri[]; kendi?: KendiDurumu }> {
  const { data, error } = await supabase
    .from('lig_gunluk')
    .select('en_iyi_puan, oyuncu:oyuncu_id(kullanici_adi)')
    .eq('tarih', tarih)
    .eq('oyun', oyun)
    .eq('seviye', seviye)
    .order('en_iyi_puan', { ascending: false })
    .limit(100);

  if (error || !data) return { satirlar: [] };

  // Supabase join tipi [{ en_iyi_puan, oyuncu: {kullanici_adi} }]
  const liste = data as unknown as { en_iyi_puan: number; oyuncu: { kullanici_adi: string } | null }[];
  const satirlar: LigSatiri[] = liste.map((r, i) => ({
    sira: i + 1,
    kullaniciAdi: r.oyuncu?.kullanici_adi ?? '?',
    puan: r.en_iyi_puan,
    benimMi: false, // oyuncu_id join yok; aşağıda isitten belirlenir
  }));

  // Kendi kaydını bul
  let kendi: KendiDurumu | undefined;
  if (oyuncuId) {
    const { data: kData } = await supabase
      .from('lig_gunluk')
      .select('en_iyi_puan')
      .eq('tarih', tarih)
      .eq('oyun', oyun)
      .eq('seviye', seviye)
      .eq('oyuncu_id', oyuncuId)
      .maybeSingle();

    if (kData) {
      const { count } = await supabase
        .from('lig_gunluk')
        .select('*', { count: 'exact', head: true })
        .eq('tarih', tarih)
        .eq('oyun', oyun)
        .eq('seviye', seviye)
        .gt('en_iyi_puan', kData.en_iyi_puan);

      kendi = { sira: (count ?? 0) + 1, puan: kData.en_iyi_puan };
    }
  }

  return { satirlar, kendi };
}

/** Dönem lig sorgular (haftalık veya aylık). */
export async function donemLig(
  donemTipi: 'hafta' | 'ay',
  donemAnahtar: string,
  oyun: string,
  seviye: string,
  oyuncuId?: string,
): Promise<{ satirlar: LigSatiri[]; kendi?: KendiDurumu }> {
  const { data, error } = await supabase
    .from('lig_donem')
    .select('toplam_puan, gun_sayisi, oyuncu:oyuncu_id(kullanici_adi)')
    .eq('donem_tipi', donemTipi)
    .eq('donem_anahtar', donemAnahtar)
    .eq('oyun', oyun)
    .eq('seviye', seviye)
    .order('toplam_puan', { ascending: false })
    .limit(100);

  if (error || !data) return { satirlar: [] };

  const liste = data as unknown as { toplam_puan: number; gun_sayisi: number; oyuncu: { kullanici_adi: string } | null }[];
  const satirlar: LigSatiri[] = liste.map((r, i) => ({
    sira: i + 1,
    kullaniciAdi: r.oyuncu?.kullanici_adi ?? '?',
    puan: r.toplam_puan,
    gunSayisi: r.gun_sayisi,
    benimMi: false,
  }));

  let kendi: KendiDurumu | undefined;
  if (oyuncuId) {
    const { data: kData } = await supabase
      .from('lig_donem')
      .select('toplam_puan')
      .eq('donem_tipi', donemTipi)
      .eq('donem_anahtar', donemAnahtar)
      .eq('oyun', oyun)
      .eq('seviye', seviye)
      .eq('oyuncu_id', oyuncuId)
      .maybeSingle();

    if (kData) {
      const { count } = await supabase
        .from('lig_donem')
        .select('*', { count: 'exact', head: true })
        .eq('donem_tipi', donemTipi)
        .eq('donem_anahtar', donemAnahtar)
        .eq('oyun', oyun)
        .eq('seviye', seviye)
        .gt('toplam_puan', kData.toplam_puan);

      kendi = { sira: (count ?? 0) + 1, puan: kData.toplam_puan };
    }
  }

  return { satirlar, kendi };
}

// ---------------------------------------------------------------------------
// Oyuncu profil sorguları
// ---------------------------------------------------------------------------

export interface ProfilIstatistik {
  kullaniciAdi: string;
  olusturuldu: string;
  enIyiPuanlar: { seviye: string; puan: number }[];
  tamIsabetSayisi: number;
  toplamTurSayisi: number;
  son28Gun: { tarih: string; var: boolean }[];
}

/** Herkese açık profil verisi — kullanıcı adına göre. */
export async function profilIstatistikOku(kullaniciAdi: string): Promise<ProfilIstatistik | null> {
  // 1. Oyuncu satırını bul
  const { data: oyuncu } = await supabase
    .from('oyuncu')
    .select('id, kullanici_adi, olusturuldu')
    .ilike('kullanici_adi', kullaniciAdi)
    .maybeSingle();

  if (!oyuncu) return null;

  // 2. Seviye bazlı en iyi puanlar (lig_gunluk'tan)
  const { data: enIyi } = await supabase
    .from('lig_gunluk')
    .select('seviye, en_iyi_puan')
    .eq('oyuncu_id', oyuncu.id)
    .eq('oyun', 'sayi')
    .order('en_iyi_puan', { ascending: false });

  // Seviye başına max puan
  const seviyeMap = new Map<string, number>();
  for (const r of enIyi ?? []) {
    const mevcut = seviyeMap.get(r.seviye) ?? 0;
    if (r.en_iyi_puan > mevcut) seviyeMap.set(r.seviye, r.en_iyi_puan);
  }
  const enIyiPuanlar = Array.from(seviyeMap.entries()).map(([seviye, puan]) => ({ seviye, puan }));

  // 3. Toplam tur sayısı ve tam isabet sayısı (tur_sonuc'tan)
  const { count: toplamTurSayisi } = await supabase
    .from('tur_sonuc')
    .select('*', { count: 'exact', head: true })
    .eq('oyuncu_id', oyuncu.id)
    .eq('oyun', 'sayi');

  const { count: tamIsabetSayisi } = await supabase
    .from('tur_sonuc')
    .select('*', { count: 'exact', head: true })
    .eq('oyuncu_id', oyuncu.id)
    .eq('oyun', 'sayi')
    .eq('uzaklik', 0);

  // 4. Son 28 günlük aktivite (lig_gunluk'tan)
  const bugun = new Date();
  const baslangic = new Date(bugun);
  baslangic.setUTCDate(bugun.getUTCDate() - 27);
  const baslangicStr = baslangic.toISOString().split('T')[0]!;

  const { data: aktifGunler } = await supabase
    .from('lig_gunluk')
    .select('tarih')
    .eq('oyuncu_id', oyuncu.id)
    .eq('oyun', 'sayi')
    .gte('tarih', baslangicStr);

  const aktifSet = new Set((aktifGunler ?? []).map((r: { tarih: string }) => r.tarih));

  const son28Gun: { tarih: string; var: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const t = new Date(bugun);
    t.setUTCDate(bugun.getUTCDate() - i);
    const tarih = t.toISOString().split('T')[0]!;
    son28Gun.push({ tarih, var: aktifSet.has(tarih) });
  }

  return {
    kullaniciAdi: oyuncu.kullanici_adi,
    olusturuldu: oyuncu.olusturuldu,
    enIyiPuanlar,
    tamIsabetSayisi: tamIsabetSayisi ?? 0,
    toplamTurSayisi: toplamTurSayisi ?? 0,
    son28Gun,
  };
}
