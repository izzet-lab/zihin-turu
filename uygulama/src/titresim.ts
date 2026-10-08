/**
 * titresim.ts — Dokunsal geri bildirim (haptik).
 *
 * NEDEN VAR
 * Mobil oyun hissinin yarısı parmaktan gelir. Ekranda bir taşın
 * küçülmesini görmekle, basarken telefonun kısacık cevap vermesi
 * arasında büyük fark var.
 *
 * DÖRT ŞİDDET
 *   hafif  — taş/harf seçimi (en sık olan, en zayıf olan)
 *   orta   — işlem tamamlandı, iki taş birleşti
 *   basari — tam isabet: iki kısa vuruş
 *   kayip  — tur/maç kaybı: tek uzun vuruş
 *
 * KAPATILABİLİR
 * Gizlilik ayarlarından kapatılıyor (kural 7'nin ruhu: kullanıcı
 * kapattığında gerçekten kapanmalı). Tercih localStorage'da, karar
 * burada; ekran yalnızca anahtarı çeviriyor.
 *
 * SESSİZ BAŞARISIZLIK
 * Tarayıcıda ve haptik motoru olmayan cihazlarda eklenti hata atar.
 * Titreşim oyunun akışını etkilemez; her çağrı yutulur.
 */

import { tercihleriOku } from './gizlilik-tercih';

export type TitresimTuru = 'hafif' | 'orta' | 'basari' | 'kayip';

/**
 * Eklenti tembel yükleniyor: titreşim kapalıysa paket hiç indirilmez
 * ve tarayıcıda boşuna yüklenmez.
 */
let eklenti: Promise<typeof import('@capacitor/haptics')> | null = null;

function yukle() {
  if (!eklenti) eklenti = import('@capacitor/haptics');
  return eklenti;
}

/** Tercih kapalıysa hiçbir şey olmaz. */
export function titresimAcikMi(): boolean {
  return tercihleriOku().titresim;
}

export function titret(tur: TitresimTuru): void {
  if (!titresimAcikMi()) return;

  void yukle()
    .then(async ({ Haptics, ImpactStyle }) => {
      switch (tur) {
        case 'hafif':
          return Haptics.impact({ style: ImpactStyle.Light });
        case 'orta':
          return Haptics.impact({ style: ImpactStyle.Medium });
        case 'basari': {
          // Çift vuruş: tam isabetin "tık-tık" tadı tek darbeyle çıkmıyor.
          await Haptics.impact({ style: ImpactStyle.Medium });
          await new Promise((r) => setTimeout(r, 90));
          return Haptics.impact({ style: ImpactStyle.Heavy });
        }
        case 'kayip':
          return Haptics.vibrate({ duration: 220 });
      }
    })
    .catch(() => {
      // Haptik motoru yok ya da izin yok — oyun etkilenmez.
    });
}
