/**
 * firebase.ts — Firebase servislerinin tek giriş kapısı.
 *
 * Hepsi YALNIZCA Android/iOS paketinde çalışır. Web'de her fonksiyon
 * sessizce hiçbir şey yapmaz; tarayıcıda oynayan kimseye Firebase
 * betiği yüklenmez (çerez politikasındaki "üçüncü taraf betik yok"
 * ifadesi web için geçerliliğini korur).
 *
 * Ayrıca google-services.json yoksa Android'de de kapalı kalır —
 * eklentiler hata fırlatır, biz yutup devam ederiz. Amaç: Firebase
 * yapılandırılmamışken bile oyunun çalışmaya devam etmesi.
 *
 * Servisler:
 *   Messaging     — günlük hatırlatma bildirimi
 *   RemoteConfig  — süre/joker gibi ayarları APK çıkarmadan değiştirme
 *   Analytics     — hangi ekranda kaç kişi, kaç tur bitti
 *   Crashlytics   — gerçek cihazlardaki çökmeler
 */

import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';
import { nativeMi } from './platform';

/** Bir Firebase çağrısını güvenle dener; hata olursa oyunu durdurmaz. */
async function dene<T>(ad: string, isle: () => Promise<T>): Promise<T | null> {
  if (!nativeMi()) return null;
  try {
    return await isle();
  } catch (e) {
    console.warn(`[firebase] ${ad} çalışmadı:`, e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Bildirim (Cloud Messaging)                                          */
/* ------------------------------------------------------------------ */

/**
 * Bildirim izni ister ve cihaz jetonunu döndürür.
 *
 * İzin KULLANICIYA SORULUR; reddedilirse hiçbir şey olmaz ve bir daha
 * zorlanmaz. Bu, uygulamanın "emir değil öneri" ilkesine uygun.
 */
export async function bildirimIzniIste(): Promise<string | null> {
  return dene('bildirim izni', async () => {
    const izin = await FirebaseMessaging.requestPermissions();
    if (izin.receive !== 'granted') return null;
    const { token } = await FirebaseMessaging.getToken();
    return token;
  });
}

/** Mevcut izin durumu — kullanıcıya sormadan öğrenmek için. */
export async function bildirimIzniVarMi(): Promise<boolean> {
  const s = await dene('izin durumu', () => FirebaseMessaging.checkPermissions());
  return s?.receive === 'granted';
}

/** Bildirim aboneliğini kapatır (jeton silinir, sunucu artık gönderemez). */
export async function bildirimiKapat(): Promise<void> {
  await dene('jeton sil', () => FirebaseMessaging.deleteToken());
}

/* ------------------------------------------------------------------ */
/* Remote Config                                                       */
/* ------------------------------------------------------------------ */

/**
 * Uzak ayarları çeker. Ağ yoksa son bilinen değerler kullanılır.
 * Çağrılmazsa uygulama koddaki varsayılanlarla çalışmaya devam eder.
 */
export async function uzakAyarlariYukle(): Promise<void> {
  await dene('remote config', async () => {
    await FirebaseRemoteConfig.fetchAndActivate();
  });
}

/** Uzak ayardan sayı okur; yoksa verilen varsayılanı döndürür. */
export async function uzakSayi(anahtar: string, varsayilan: number): Promise<number> {
  const s = await dene(`uzak ayar ${anahtar}`, () =>
    FirebaseRemoteConfig.getNumber({ key: anahtar }),
  );
  // Anahtar tanımsızsa eklenti 0 döndürür; bunu "değer yok" sayıyoruz.
  return s && s.value !== 0 ? s.value : varsayilan;
}

/** Uzak ayardan bayrak okur. */
export async function uzakBayrak(anahtar: string, varsayilan: boolean): Promise<boolean> {
  const s = await dene(`uzak bayrak ${anahtar}`, () =>
    FirebaseRemoteConfig.getBoolean({ key: anahtar }),
  );
  return s ? s.value : varsayilan;
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

/**
 * Olay kaydı. KİŞİSEL VERİ GÖNDERİLMEZ — e-posta, kullanıcı adı veya
 * oyuncu kimliği parametre olarak geçilmez. Yalnızca oyun olayları
 * (hangi seviye, tur bitti mi) gönderilir.
 */
export async function olay(ad: string, veri?: Record<string, string | number>): Promise<void> {
  await dene(`olay ${ad}`, () => FirebaseAnalytics.logEvent({ name: ad, params: veri ?? {} }));
}

/** Ekran görüntülenmesi. */
export async function ekranOlayi(ekran: string): Promise<void> {
  await dene('ekran olayi', () => FirebaseAnalytics.setCurrentScreen({ screenName: ekran }));
}

/**
 * Analytics toplamayı açar/kapatır. Kullanıcı reddederse kapatılır ve
 * hiçbir olay gönderilmez.
 */
export async function analyticsAyarla(acik: boolean): Promise<void> {
  await dene('analytics anahtari', () =>
    FirebaseAnalytics.setEnabled({ enabled: acik }),
  );
}

/* ------------------------------------------------------------------ */
/* Crashlytics                                                         */
/* ------------------------------------------------------------------ */

/** Çökme raporlamayı açar/kapatır. */
export async function crashlyticsAyarla(acik: boolean): Promise<void> {
  await dene('crashlytics anahtari', () =>
    FirebaseCrashlytics.setEnabled({ enabled: acik }),
  );
}

/** Beklenmedik ama çökmeye yol açmayan bir hatayı bildirir. */
export async function hataBildir(mesaj: string): Promise<void> {
  await dene('hata bildir', () => FirebaseCrashlytics.recordException({ message: mesaj }));
}
