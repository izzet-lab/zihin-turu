/**
 * Kimlik — auth durum tiplemeleri ve yardımcılar.
 *
 * Supabase Auth'u bu dosyadan geçirerek kullanıyoruz; diğer ekranlar
 * doğrudan supabase.auth.* çağırmaz. Bu, ilerideki değişiklikleri
 * tek noktada toplar.
 */

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { oku } from './depo';

/** Oyuncunun uygulama içi profili (oyuncu tablosundan). */
export interface OyuncuProfil {
  id: string;
  kullaniciAdi: string;
  gorunenAd: string | null;
}

/**
 * Mevcut kullanıcıyı ve profilini döner.
 * Giriş yapılmamışsa { kullanici: null, profil: null }.
 */
export async function oturumOku(): Promise<{ kullanici: User | null; profil: OyuncuProfil | null }> {
  const { data } = await supabase.auth.getSession();
  const kullanici = data.session?.user ?? null;
  if (!kullanici) return { kullanici: null, profil: null };

  const profil = await profilOku(kullanici.id);
  return { kullanici, profil };
}

/** Oyuncu profilini veritabanından çeker. Yoksa null. */
export async function profilOku(oyuncuId: string): Promise<OyuncuProfil | null> {
  const { data } = await supabase
    .from('oyuncu')
    .select('id, kullanici_adi, gorunen_ad')
    .eq('id', oyuncuId)
    .single();
  if (!data) return null;
  return { id: data.id, kullaniciAdi: data.kullanici_adi, gorunenAd: data.gorunen_ad };
}

/**
 * Kullanıcı adı seçimi — yeni üye için bir kerelik.
 * 3–16 karakter, sadece harf/rakam/alt çizgi/tire, benzersiz.
 * Başarısızsa hata mesajı döner.
 */
export async function kullaniciAdiAyarla(oyuncuId: string, ad: string): Promise<string | null> {
  const temiz = ad.trim().toLowerCase();
  const hata = kullaniciAdiDogrula(temiz);
  if (hata) return hata;

  const { error } = await supabase.from('oyuncu').insert({
    id: oyuncuId,
    kullanici_adi: temiz,
    gorunen_ad: ad.trim(),
  });

  if (error) {
    // 23505 = benzersizlik ihlali
    if (error.code === '23505') return 'Bu kullanıcı adı alınmış. Başka bir tane dene.';
    return 'Bir hata oluştu, tekrar dene.';
  }
  return null;
}

/**
 * Kullanıcı adı formatını kontrol eder. Geçerliyse null, değilse
 * gösterilebilir hata metni döner.
 */
export function kullaniciAdiDogrula(ad: string): string | null {
  if (ad.length < 3) return 'En az 3 karakter olmalı.';
  if (ad.length > 16) return 'En fazla 16 karakter olabilir.';
  // Harf (Türkçe dahil), rakam, alt çizgi, tire — boşluk yok.
  if (!/^[\p{L}\p{N}_-]+$/u.test(ad)) return 'Yalnızca harf, rakam, _ ve - kullanılabilir.';
  if (KUFUR_LISTESI.some((k) => ad.includes(k))) return 'Bu kullanıcı adı kullanılamaz.';
  return null;
}

/**
 * Misafirken biriken localStorage geçmişini sunucuya taşır.
 * Yalnızca kişisel istatistikler (seri, tam isabet, şerit) taşınır.
 * LİG PUANI devralınmaz — veri tarayıcıdan geliyor, uydurulabilir.
 *
 * Başarısızsa sessizce geçer (kritik değil — veri tarayıcıda duruyor).
 */
export async function misafirGecmisiniTasi(oyuncuId: string): Promise<void> {
  const ilerleme = oku();
  // Hiç veri yoksa taşıma gereksiz
  if (!ilerleme.seri.son && ilerleme.tam === 0) return;

  // Lig puanı içermeyecek şekilde sadece kişisel istatistikleri al.
  // gunluk kaydı da taşınır (kişisel arşiv; lig tablosuna işlenmez).
  const tasimaSeti = {
    seri: ilerleme.seri,
    tam: ilerleme.tam,
    gunluk: ilerleme.gunluk,
    acikSeviyeler: ilerleme.acikSeviyeler,
    tasinmaTarihi: new Date().toISOString(),
  };

  await supabase
    .from('devralinan_gecmis')
    .upsert({ oyuncu_id: oyuncuId, veri: tasimaSeti })
    .then(({ error }) => {
      if (error) console.warn('[Kimlik] Geçmiş taşıma hatası:', error.message);
    });
}

/**
 * Tur sonucunu sunucuya gönderir. Sunucu bağımsız doğrular ve yazar.
 * Başarısızsa null döner (misafir oyuncuda veya ağ hatasında da null).
 *
 * Dikkat: sunucu KENDİ hesapladığı puanı döner — istemcinin
 * bildirdiği `puan` yalnızca anlık gösterim içindir.
 */
export async function turGonder(params: {
  oyun: string;
  mod: string;
  seviye: string;
  tarih: string;
  tohum: number;
  adimlar: { a: number; b: number; islem: string; sonuc: number }[];
  sure_sn: number;
  kalan_sn: number;
  jokerler: string[];
  buyuk_adet?: number;
}): Promise<{ puan: number; uzaklik: number } | null> {
  const { data: oturum } = await supabase.auth.getSession();
  if (!oturum.session) return null; // giriş yapılmamış

  const jwt = oturum.session.access_token;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  if (!url || url === 'https://placeholder.supabase.co') return null;

  try {
    const yanit = await fetch(`${url}/functions/v1/tur-gonder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(params),
    });

    if (!yanit.ok) {
      const hata = await yanit.json().catch(() => ({})) as { hata?: string };
      // 409 = aynı tur zaten gönderildi (normal durum: sayfa yenilemesi)
      if (yanit.status === 409) return null;
      console.warn('[turGonder] Sunucu hatası:', hata?.hata ?? yanit.status);
      return null;
    }

    return await yanit.json() as { puan: number; uzaklik: number };
  } catch (e) {
    console.warn('[turGonder] Ağ hatası:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Küfür listesi — açık Türkçe hakaret ve küfürler.
// Tam liste değil; moderasyon sonraki aşamada. Kaba tarama.
// ---------------------------------------------------------------------------
const KUFUR_LISTESI: string[] = [
  'fuck', 'shit', 'porno', 'sikiş', 'sik', 'orospu', 'amk',
  'bok', 'piç', 'oç', 'göt', 'yarrak', 'amına',
];
