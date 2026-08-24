/**
 * bildirim.ts — Günlük tur hatırlatmasının NATIVE katmanı.
 *
 * FCM KULLANILMAZ — FCM sunucudan tetiklenir, günlük hatırlatma için
 * gerekmez. @capacitor/local-notifications ile bildirim cihaz üstünde
 * planlanır. Avantajları:
 *   - Sunucu gerektirmez
 *   - Ücretli plan istemez
 *   - Token saklamaz (KVKK'da bir veri kalemi daha az)
 *   - Çevrimdışı çalışır
 *
 * Mevcut FCM altyapısı SİLİNMEZ — Faz 4'te düello bildirimleri için
 * gerekecek. Yalnızca günlük hatırlatma yerel yapılır.
 *
 * KARAR BURADA VERİLMEZ. "Bugün mü yarın mı, hangi metinle, yoksa hiç
 * mi" sorusunu `bildirim-karar.ts` saf olarak cevaplıyor ve testleri
 * orada. Bu dosya yalnızca o kararı native API'ye çevirir.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { nativeMi } from './platform';
import {
  gunlukKilitli,
  bugun,
  bildirimAyariOku,
  oku,
  seriKorumaHakkiVarMi,
} from './depo';
import { planlamaKarariVer } from './bildirim-karar';

/** Sabit bildirim kimliği — her gün aynı kayıt güncellenir. */
const BILDIRIM_ID = 42;

/** Android 8+ bildirim kanalı. */
const KANAL_ID = 'gunluk-tur';

/**
 * Android bildirim kanalını oluşturur. Kanal zaten varsa sessizce geçer.
 * Kanalı silip yeniden oluşturmak kullanıcının ses/titreşim ayarlarını
 * sıfırlar, o yüzden hiç silinmez.
 */
async function kanalOlustur(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: KANAL_ID,
      name: 'Günlük tur hatırlatması',
      description: 'Her gün seçilen saatte günün turu hatırlatılır.',
      importance: 3, // DEFAULT
      visibility: 0, // PRIVATE
      vibration: true,
      sound: 'default',
    });
  } catch {
    // Kanal kurulamazsa bildirim yine çalışır, varsayılan kanala düşer.
  }
}

/** Bildirim izninin mevcut durumu. Kullanıcıya sormaz. */
export async function bildirimIzniDurumu(): Promise<boolean> {
  if (!nativeMi()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Bildirim izni ister — sistem diyaloğu çıkar.
 *
 * İZİN ZAMANLAMASI: bu fonksiyon uygulama ilk açılışta ÇAĞRILMAZ.
 * Kullanıcı daha oyunu görmeden reddediyor ve Android'de ikinci kez
 * sormak mümkün olmuyor. İlk tur bittikten sonra, sonuç ekranında
 * çağrılır.
 *
 * Reddedilirse zorlamayız; sistem ayarlarına yönlendirmeyiz.
 */
export async function bildirimIzniIste(): Promise<boolean> {
  if (!nativeMi()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

/** Planlanmış hatırlatmayı iptal eder. */
export async function bildirimiIptalEt(): Promise<void> {
  if (!nativeMi()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: BILDIRIM_ID }] });
  } catch {
    // İptal edilecek bir şey yoksa sorun değil.
  }
}

/**
 * Günlük hatırlatmayı (yeniden) planlar.
 *
 * Her açılışta, ayar değişiminde ve tur bitiminde çağrılır. Ne
 * yapılacağına saf karar katmanı karar verir; burada yalnızca uygulanır.
 *
 * `bugunOynandiMi` dışarıdan verilebilir: tur biter bitmez çağrıldığında
 * depo henüz okunmuş olabilir, gereksiz ikinci okuma yapılmasın diye.
 */
export async function bildirimiPlanla(bugunOynandiMi?: boolean): Promise<void> {
  if (!nativeMi()) return;

  const gun = bugun();
  const karar = planlamaKarariVer({
    ayar: bildirimAyariOku(),
    izinVar: await bildirimIzniDurumu(),
    simdi: new Date(),
    bugunOynandi: bugunOynandiMi ?? gunlukKilitli(gun),
    seriGun: oku().seri.gun,
    korumaHakkiVar: seriKorumaHakkiVarMi(gun),
  });

  // Eski kayıt her durumda temizlenir; "planla" ise üstüne yenisi kurulur.
  await bildirimiIptalEt();
  if (karar.tur === 'iptal') return;

  await kanalOlustur();
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: BILDIRIM_ID,
          title: karar.baslik,
          body: karar.govde,
          schedule: { at: karar.ne },
          channelId: KANAL_ID,
          extra: { ekran: 'gunun-turu' },
        },
      ],
    });
  } catch (e) {
    console.warn('[bildirim] planlama başarısız:', e);
  }
}

/**
 * Günün Turu oynanınca çağrılır: bugünkü hatırlatma düşer, yarınki kurulur.
 * Oynamış kişiye "oyna" demek, bildirimi kapattıran en hızlı şey.
 */
export async function bugunOynandiYarinPlanla(): Promise<void> {
  await bildirimiPlanla(true);
}

/**
 * Bildirime dokunulunca Günün Turu'na gitmek için olay yayınlar.
 * Dinleyicisi `Uygulama.tsx` içinde.
 */
export function bildirimDinleyiciKur(): void {
  if (!nativeMi()) return;

  LocalNotifications.addListener('localNotificationActionPerformed', (olay) => {
    const extra = olay.notification.extra as { ekran?: string } | undefined;
    if (extra?.ekran === 'gunun-turu') {
      window.dispatchEvent(new CustomEvent('zt-bildirim-tiklandi'));
    }
  });
}
