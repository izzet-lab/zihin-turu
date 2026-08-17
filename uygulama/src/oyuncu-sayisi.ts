/**
 * Gerçek oyuncu sayıları — sahte sayı kullanılmaz.
 * Eşiğin altındayken hiç gösterilmez: boş bırakmak, yalan söylemekten iyidir.
 */

import { supabase } from './supabase';

const ESIK_BUGUN_OYNAYANLAR = 30;
const ESIK_TAM_ISABET = 10;

interface OyuncuSayilari {
  /** "Bugün X kişi oynadı" — null ise eşiğin altında, gösterme. */
  bugunOynayanlar: number | null;
  /** "Bugünün turunu X kişi tam bildi" — null ise eşiğin altında. */
  bugunTamIsabet: number | null;
}

/** Bugünkü oyuncu sayılarını veritabanından çeker. */
export async function oyuncuSayilariOku(tarih: string): Promise<OyuncuSayilari> {
  // Bugün oynayan benzersiz oyuncu sayısı
  const { count: oynayanlar } = await supabase
    .from('tur_sonuc')
    .select('oyuncu_id', { count: 'exact', head: true })
    .eq('oyun', 'sayi')
    .eq('mod', 'gunun')
    .eq('tarih', tarih);

  // Bugün tam isabet yapan benzersiz oyuncu sayısı
  const { count: tamIsabet } = await supabase
    .from('tur_sonuc')
    .select('oyuncu_id', { count: 'exact', head: true })
    .eq('oyun', 'sayi')
    .eq('mod', 'gunun')
    .eq('tarih', tarih)
    .eq('uzaklik', 0);

  const o = oynayanlar ?? 0;
  const t = tamIsabet ?? 0;

  return {
    bugunOynayanlar: o >= ESIK_BUGUN_OYNAYANLAR ? o : null,
    bugunTamIsabet: t >= ESIK_TAM_ISABET ? t : null,
  };
}
