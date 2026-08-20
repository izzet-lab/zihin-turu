/**
 * firebase-web-bos.ts — tarayıcı için boş Firebase modülü.
 *
 * @capacitor-firebase/* eklentilerinin web uygulamaları `firebase/*`
 * paketlerini içe aktarır. Bizim Firebase kullanımımız YALNIZCA Android
 * içindir; tarayıcıya Firebase kütüphanesi indirilmemelidir.
 *
 * Bunun iki sebebi var:
 *   1. Çerez politikası "tarayıcıya bu kütüphaneler hiç indirilmez"
 *      diyor — bu dosya o taahhüdün teknik karşılığı.
 *   2. Gereksiz yüz kilobaytlarca JavaScript inmesin.
 *
 * vite.config.ts bu dosyayı `firebase/messaging`, `firebase/analytics`
 * ve `firebase/remote-config` yerine koyar. Fonksiyonlar çağrılmaz —
 * platform.ts zaten web'de tüm Firebase çağrılarını engelliyor — ama
 * içe aktarma çözülebilsin diye tanımlı olmaları gerekir.
 */

const yok = () => {
  throw new Error('Firebase tarayıcıda kullanılmaz.');
};

/*
 * Aşağıdaki liste, eklentilerin web uygulamalarından çıkarılmıştır:
 *   grep "from 'firebase/…'" node_modules/@capacitor-firebase/(*)/dist/esm/web.js
 * Yeni bir @capacitor-firebase eklentisi eklenirse bu liste
 * genişletilmelidir; eksik ad derleme hatası verir (sessiz kalmaz).
 */

/* firebase/messaging */
export const deleteToken = yok;
export const getMessaging = yok;
export const getToken = yok;
export const onMessage = yok;
export const isSupported = async () => false;

/* firebase/analytics */
export const getAnalytics = yok;
export const logEvent = yok;
export const setAnalyticsCollectionEnabled = yok;
export const setConsent = yok;
export const setUserId = yok;
export const setUserProperties = yok;

/* firebase/remote-config */
export const activate = yok;
export const fetchAndActivate = yok;
export const fetchConfig = yok;
export const getAll = yok;
export const getRemoteConfig = yok;
export const getValue = yok;
export const setCustomSignals = yok;
