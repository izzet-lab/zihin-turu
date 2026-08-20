/**
 * bildirim.ts — Günlük tur hatırlatması (yerel bildirim).
 *
 * FCM KULLANILMAZ — FCM sunucudan tetiklenir, burada gerek yok.
 * @capacitor/local-notifications ile her gün seçilen saatte cihaz
 * üstünde planlanan bir bildirim kurulur. Avantajları:
 *   - Sunucu gerektirmez
 *   - Ücretli plan istemez
 *   - Token saklamaz (KVKK'da bir veri kalemi daha az)
 *   - Çevrimdışı çalışır
 *
 * Bildirime dokununca uygulama açılır ve Günün Turu ekranı gösterilir
 * (Capacitor'da yerel bildirime tıklanınca uygulama zaten açılır;
 * extra data ile hangi ekranın açılacağı belirlenir).
 *
 * Mevcut FCM altyapısı SİLİNMEZ — Faz 4'te düello bildirimleri için
 * gerekecek. Yalnızca günlük hatırlatma yerel olarak yapılır.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { nativeMi } from './platform';
import { gunlukKilitli, bugun } from './depo';
import { bildirimAyariOku } from './depo';

/** Sabit bildirim kimliği — her gün aynı ID güncellenir. */
const BILDIRIM_ID = 42;

/** Kanal ID (Android 8+). */
const KANAL_ID = 'gunluk-tur';

/**
 * Dönen bildirim metinleri. Aynı metin iki kez arka arkaya çıkmasın
 * diye günün tarihinden deterministik indeks türetilir.
 */
const MESAJLAR: { baslik: string; govde: string }[] = [
  { baslik: 'Günün turu hazır 🎯', govde: 'Bugünkü bulmaca seni bekliyor.' },
  { baslik: 'Yeni bir tur var!', govde: 'Bugünün sayıları hazır, dene.' },
  { baslik: 'Bugünkü tur açıldı', govde: 'Sayılarla biraz oyna, 2 dakika yeter.' },
  { baslik: 'Bulmaca zamanı 🧩', govde: 'Günün turu hazır. Kaç puan yaparsın?' },
  { baslik: 'Günün turu seni bekliyor', govde: 'Kısa bir mola ver, bir tur dene.' },
  { baslik: 'Hazır mısın? 🎲', govde: 'Bugünün bulmacası seni bekliyor.' },
];

/** Seri farkında mesajlar — seri varken bunlar eklenir. */
const SERI_MESAJLARI: ((gun: number) => { baslik: string; govde: string })[] = [
  (g) => ({ baslik: `${g} günlük serin var 🔥`, govde: 'Bugünkü turu oyna, serin devam etsin.' }),
  (g) => ({ baslik: `Seri: ${g} gün!`, govde: 'Bir tur daha ve serin büyüyor.' }),
  (g) => ({ baslik: `${g}. gündesin 💪`, govde: 'Günün turunu kaçırma, serin kırılmasın.' }),
];

/** Seri koruma hakkı varken eklenen not. */
const KORUMA_NOTU = ' Seri koruma hakkın da var — istersen dinlenebilirsin.';

/**
 * Bugünün tarihinden deterministik indeks türetir.
 * Aynı gün hep aynı mesajı verir, farklı gün farklısını.
 */
function gunIndeksi(gun: string, uzunluk: number): number {
  let hash = 0;
  for (let i = 0; i < gun.length; i++) {
    hash = (hash * 31 + gun.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % uzunluk;
}

/**
 * O gün gösterilecek bildirim metnini seçer.
 * Seri varsa seri mesajı, yoksa genel mesaj döner.
 */
function mesajSec(
  gun: string,
  seriGun: number,
  korumaVarMi: boolean,
): { baslik: string; govde: string } {
  if (seriGun >= 2) {
    const uretici = SERI_MESAJLARI[gunIndeksi(gun, SERI_MESAJLARI.length)]!;
    const mesaj = uretici(seriGun);
    if (korumaVarMi) {
      mesaj.govde += KORUMA_NOTU;
    }
    return mesaj;
  }
  return MESAJLAR[gunIndeksi(gun, MESAJLAR.length)]!;
}

/**
 * Android bildirim kanalını oluşturur. Kanal zaten varsa sessizce geçer.
 * Android 8+ kanalı silip yeniden oluşturmak kullanıcının ses/titreşim
 * ayarlarını sıfırlar, o yüzden yalnızca bir kez yapılır.
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
    // Kanal oluşturulamazsa bildirim yine çalışır, varsayılan kanala düşer.
  }
}

/**
 * Bildirim izninin mevcut durumunu öğrenir. Kullanıcıya sormaz.
 */
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
 * Bildirim izni ister. İlk kez çağrıldığında sistem diyaloğu çıkar.
 * Reddedilirse bir daha zorlamayız (Android'de ikinci istekte sistem
 * ayarlarına yönlendirir, biz bunu yapmayız — özerklik ilkesi).
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

/**
 * Günlük hatırlatma bildirimini planlar.
 *
 * Her gün seçilen saatte tetiklenir. Bildirim, kullanıcı o gün zaten
 * oynamışsa GÖSTERİLMEZ — bu kontrolü bildirim anında yapmak mümkün
 * olmadığından (yerel bildirimler statik), strateji şöyle:
 *
 * 1. Uygulama açılışında bugünkü bildirim planlanır
 * 2. Günün Turu oynanınca bugünkü bildirim iptal edilir
 * 3. Yarın için yeni bildirim planlanır
 *
 * Bu fonksiyon HER AÇILIŞTA çağrılır; ayar kapalıysa iptal eder.
 */
export async function bildirimiPlanla(
  seriGun = 0,
  korumaVarMi = false,
): Promise<void> {
  if (!nativeMi()) return;

  const ayar = bildirimAyariOku();

  // Bildirim kapalıysa tüm planlanmışları iptal et
  if (!ayar.acik) {
    await bildirimiIptalEt();
    return;
  }

  // İzin var mı kontrol et
  const izinVar = await bildirimIzniDurumu();
  if (!izinVar) return;

  await kanalOlustur();

  // Bugün zaten oynanmışsa bildirimi iptal et, yarını planla
  const gun = bugun();
  const oynandi = gunlukKilitli(gun);

  // Tüm eski bildirimleri temizle
  try {
    await LocalNotifications.cancel({ notifications: [{ id: BILDIRIM_ID }] });
  } catch {
    // İptal edilecek bildirim yoksa sorun değil
  }

  if (oynandi) {
    // Bugün oynandı, yarını planla
    await yarinPlanla(ayar.saat, ayar.dakika, seriGun, korumaVarMi);
  } else {
    // Bugün planla (saat geçtiyse yarını planla)
    const simdi = new Date();
    const hedef = new Date();
    hedef.setHours(ayar.saat, ayar.dakika, 0, 0);

    if (hedef <= simdi) {
      // Saat geçmiş, yarını planla
      await yarinPlanla(ayar.saat, ayar.dakika, seriGun, korumaVarMi);
    } else {
      const mesaj = mesajSec(gun, seriGun, korumaVarMi);
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: BILDIRIM_ID,
              title: mesaj.baslik,
              body: mesaj.govde,
              schedule: { at: hedef },
              channelId: KANAL_ID,
              extra: { ekran: 'gunun-turu' },
            },
          ],
        });
      } catch (e) {
        console.warn('[bildirim] planlama başarısız:', e);
      }
    }
  }
}

/**
 * Yarın için bildirim planlar.
 */
async function yarinPlanla(
  saat: number,
  dakika: number,
  seriGun: number,
  korumaVarMi: boolean,
): Promise<void> {
  const yarin = new Date();
  yarin.setDate(yarin.getDate() + 1);
  yarin.setHours(saat, dakika, 0, 0);

  const yarinStr = yarin.toISOString().slice(0, 10);
  const mesaj = mesajSec(yarinStr, seriGun, korumaVarMi);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: BILDIRIM_ID,
          title: mesaj.baslik,
          body: mesaj.govde,
          schedule: { at: yarin },
          channelId: KANAL_ID,
          extra: { ekran: 'gunun-turu' },
        },
      ],
    });
  } catch (e) {
    console.warn('[bildirim] yarın planlama başarısız:', e);
  }
}

/**
 * Tüm planlanmış bildirimleri iptal eder.
 * Gizlilik ayarlarından bildirim kapatılınca çağrılır.
 */
export async function bildirimiIptalEt(): Promise<void> {
  if (!nativeMi()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: BILDIRIM_ID }] });
  } catch {
    // Zaten yoksa sorun değil
  }
}

/**
 * Bugünkü bildirimi iptal edip yarını planlar.
 * Günün Turu oynanınca çağrılır — oynamış kişiye "oyna" demek can sıkar.
 */
export async function bugunOynandiYarinPlanla(
  seriGun = 0,
  korumaVarMi = false,
): Promise<void> {
  if (!nativeMi()) return;

  const ayar = bildirimAyariOku();
  if (!ayar.acik) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: BILDIRIM_ID }] });
  } catch {
    // Yoksa sorun değil
  }

  await yarinPlanla(ayar.saat, ayar.dakika, seriGun, korumaVarMi);
}

/**
 * Bildirime tıklanınca tetiklenen dinleyici.
 * Günün Turu ekranına yönlendirmek için CustomEvent gönderir.
 */
export function bildirimDinleyiciKur(): void {
  if (!nativeMi()) return;

  LocalNotifications.addListener('localNotificationActionPerformed', (olay) => {
    const extra = olay.notification.extra as { ekran?: string } | undefined;
    if (extra?.ekran === 'gunun-turu') {
      // Ana sayfaya yönlendir — Uygulama.tsx zaten kurulum ekranında
      // Günün Turu sekmesini açar.
      window.dispatchEvent(new CustomEvent('zt-bildirim-tiklandi'));
    }
  });
}

// Export mesajSec for testing if needed
export { mesajSec as _mesajSec };
