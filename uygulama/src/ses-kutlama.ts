/**
 * ses-kutlama.ts — Tam isabet kutlamasının sesi.
 *
 * Diğer oyun sesleri koddan üretiliyor (bkz. `ses.ts`); bunlar
 * dosyadan geliyor çünkü marka sesi — kodla üretilemez.
 *
 * ÖNCEDEN YÜKLENİR
 * Tam isabet anında indirilmeye başlasaydı ses yarım saniye geç
 * çalardı ve kutlama "sonradan yapıştırılmış" gibi dururdu. Dosyalar
 * ilk dokunuşta, ses kilidi açılırken sessizce indiriliyor.
 *
 * TEK BİÇİM İNER
 * Her ses hem MP3 hem OGG olarak duruyor ama tarayıcı yalnızca
 * desteklediğini indiriyor; ikisi birden inmiyor.
 *
 * ÜST ÜSTE BİNMEZ
 * Çalan bir ses varken yenisi başlamıyor. İki kutlama arka arkaya
 * gelirse (arena biterken seri kilometre taşı gibi) iki ses
 * birbirine karışır ve ikisi de anlaşılmaz.
 *
 * SES KAPALIYSA HİÇBİR ŞEY OLMAZ
 * Mevcut ses anahtarı ikisini de yönetiyor; ayrı bir ayar yok.
 */

import { sesAcikMi } from './depo';
import { sesBaglamiAl } from './ses';

/** Yayınlanan ses dosyaları (bkz. `araclar/ses-uret.sh`). */
const DOSYALAR = {
  kisa: 'C-tek-vurus',
  uzun: 'B-ok-ve-hedef',
  seslendirme: 'tam-isabet',
} as const;

export type SesAdi = keyof typeof DOSYALAR;

const tamponlar = new Map<SesAdi, AudioBuffer>();
let yukleniyor = false;

/** Tarayıcının desteklediği biçim. OGG daha küçük, Safari çalmıyor. */
function uzanti(): 'ogg' | 'mp3' {
  if (typeof document === 'undefined') return 'mp3';
  const a = document.createElement('audio');
  return a.canPlayType('audio/ogg; codecs=vorbis') ? 'ogg' : 'mp3';
}

/**
 * Ses dosyalarını indirip çözer. Birden fazla çağrılsa da bir kez
 * çalışır; hata hâlinde sessizce vazgeçer — ses bir süs, oyunun
 * akışını durdurmamalı.
 */
export async function kutlamaSesleriniYukle(): Promise<void> {
  if (yukleniyor || tamponlar.size > 0) return;
  yukleniyor = true;
  const baglam = sesBaglamiAl();
  if (!baglam) return;

  const ek = uzanti();
  await Promise.all(
    (Object.keys(DOSYALAR) as SesAdi[]).map(async (ad) => {
      try {
        const yanit = await fetch(`/ses/${DOSYALAR[ad]}.${ek}`);
        if (!yanit.ok) return;
        const ham = await yanit.arrayBuffer();
        tamponlar.set(ad, await baglam.decodeAudioData(ham));
      } catch {
        // İnternet yoksa ya da dosya bozuksa o ses çalmaz, oyun sürer.
      }
    }),
  );
}

/** Şu an çalan sesin bitiş zamanı (AudioContext saatinde). */
let doluyaKadar = 0;

/**
 * Bir sesi çalar. Çalan ses varsa ATLANIR.
 *
 * @param gecikmeSn Birden fazla ses sıralanırken kullanılır
 *                  (seslendirme jingle'ın üstüne değil, peşine gelir).
 */
function cal(ad: SesAdi, gecikmeSn = 0): number {
  if (!sesAcikMi()) return 0;
  const baglam = sesBaglamiAl();
  const tampon = tamponlar.get(ad);
  if (!baglam || !tampon) return 0;

  const baslangic = baglam.currentTime + gecikmeSn;
  // Üst üste binme koruması: sıraya eklenen ses, çalanın bitişinden
  // önce başlayacaksa hiç başlamaz.
  if (gecikmeSn === 0 && baslangic < doluyaKadar) return 0;

  try {
    const kaynak = baglam.createBufferSource();
    kaynak.buffer = tampon;
    kaynak.connect(baglam.destination);
    kaynak.start(baslangic);
    doluyaKadar = Math.max(doluyaKadar, baslangic + tampon.duration);
    return tampon.duration;
  } catch {
    return 0;
  }
}

/** Katman 1: her tam isabette çalan kısa vuruş. */
export function kisaKutlamaCal(): void {
  cal('kisa');
}

/**
 * Katman 2: uzun jingle + hemen ardından "Tam isabet!" seslendirmesi.
 *
 * Seslendirme jingle'ın ÜSTÜNE değil PEŞİNE geliyor; üst üste
 * binseydi ikisi de anlaşılmazdı.
 */
export function torenCal(): void {
  const uzunluk = cal('uzun');
  if (uzunluk > 0) cal('seslendirme', uzunluk);
}
