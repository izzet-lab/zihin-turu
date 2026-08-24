/**
 * bildirim-karar.ts — Günlük hatırlatmanın SAF karar mantığı.
 *
 * Neden ayrı dosya: bildirim planlaması native katmana (Capacitor
 * LocalNotifications) bağlı ve tarayıcıda çalışmıyor. Kararın kendisi
 * ise saf hesap — "bugün mü yarın mı, hangi metinle, yoksa hiç mi".
 * Burada saf tutulunca gerçek cihaz olmadan test edilebiliyor.
 *
 * `bildirim.ts` yalnızca bu kararı uygular; kural kopyası tutmaz.
 */

/** Bildirim ayarı — kullanıcının seçtiği saat ve açık/kapalı durumu. */
export interface BildirimAyariGirdi {
  acik: boolean;
  saat: number;   // 0-23
  dakika: number; // 0-59
}

/** Karar için gereken her şey. Hiçbiri native değil, hepsi veri. */
export interface PlanlamaGirdisi {
  ayar: BildirimAyariGirdi;
  /** Kullanıcı bildirim iznini vermiş mi? */
  izinVar: boolean;
  /** Şu an (test edilebilirlik için dışarıdan verilir). */
  simdi: Date;
  /** Bugün günün turu oynandı mı? */
  bugunOynandi: boolean;
  /** Kesintisiz seri kaç gün? */
  seriGun: number;
  /** Bu ay seri koruma hakkı hâlâ duruyor mu? */
  korumaHakkiVar: boolean;
}

/** Kararın sonucu: ya iptal, ya belirli bir anda belirli bir metin. */
export type PlanlamaKarari =
  | { tur: 'iptal'; gerekce: 'kapali' | 'izin-yok' }
  | { tur: 'planla'; ne: Date; baslik: string; govde: string };

/**
 * Dönen bildirim metinleri. Aynı metin her gün tekrarlanmasın diye
 * günün tarihinden deterministik indeks türetilir — rastgelelik yok,
 * yani test edilebilir.
 */
const MESAJLAR: readonly { baslik: string; govde: string }[] = [
  { baslik: 'Günün turu hazır 🎯', govde: 'Bugünkü bulmaca seni bekliyor.' },
  { baslik: 'Yeni bir tur var!', govde: 'Bugünün sayıları hazır, dene.' },
  { baslik: 'Bugünkü tur açıldı', govde: 'Sayılarla biraz oyna, 2 dakika yeter.' },
  { baslik: 'Bulmaca zamanı 🧩', govde: 'Günün turu hazır. Kaç puan yaparsın?' },
  { baslik: 'Günün turu seni bekliyor', govde: 'Kısa bir mola ver, bir tur dene.' },
  { baslik: 'Hazır mısın? 🎲', govde: 'Bugünün bulmacası seni bekliyor.' },
];

/** Seri varken kullanılan metinler — seriyi hatırlatırlar. */
const SERI_MESAJLARI: readonly ((gun: number) => { baslik: string; govde: string })[] = [
  (g) => ({ baslik: `${g} günlük serin var 🔥`, govde: 'Bugünkü turu oyna, serin devam etsin.' }),
  (g) => ({ baslik: `Seri: ${g} gün!`, govde: 'Bir tur daha ve serin büyüyor.' }),
  (g) => ({ baslik: `${g}. gündesin 💪`, govde: 'Günün turunu kaçırma, serin kırılmasın.' }),
];

/** Seri koruma hakkı duruyorken metne eklenen not. */
export const KORUMA_NOTU = ' Seri koruma hakkın da var — istersen dinlenebilirsin.';

/** Seri bu uzunluktan itibaren "hatırlatmaya değer" sayılır. */
const SERI_ESIGI = 2;

/** Bir tarihi yerel saate göre 'YYYY-MM-DD' yapar. */
export function gunAnahtari(t: Date): string {
  const y = t.getFullYear();
  const a = String(t.getMonth() + 1).padStart(2, '0');
  const g = String(t.getDate()).padStart(2, '0');
  return `${y}-${a}-${g}`;
}

/** Gün dizesinden deterministik indeks — aynı gün hep aynı mesaj. */
function gunIndeksi(gun: string, uzunluk: number): number {
  let hash = 0;
  for (let i = 0; i < gun.length; i++) {
    hash = (hash * 31 + gun.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % uzunluk;
}

/**
 * O gün için bildirim metnini seçer.
 * Seri eşiği geçtiyse seriyi hatırlatan metin, yoksa genel metin.
 */
export function mesajSec(
  gun: string,
  seriGun: number,
  korumaHakkiVar: boolean,
): { baslik: string; govde: string } {
  if (seriGun >= SERI_ESIGI) {
    const uretici = SERI_MESAJLARI[gunIndeksi(gun, SERI_MESAJLARI.length)]!;
    const mesaj = uretici(seriGun);
    return korumaHakkiVar ? { ...mesaj, govde: mesaj.govde + KORUMA_NOTU } : mesaj;
  }
  return { ...MESAJLAR[gunIndeksi(gun, MESAJLAR.length)]! };
}

/** Verilen günde, seçilen saatteki anı üretir. */
function oGunSaat(temel: Date, gunFarki: number, saat: number, dakika: number): Date {
  const t = new Date(temel);
  t.setDate(t.getDate() + gunFarki);
  t.setHours(saat, dakika, 0, 0);
  return t;
}

/**
 * Günlük hatırlatma kararını verir.
 *
 * Kurallar:
 *   - Ayar kapalıysa ya da izin yoksa → iptal, hiç bildirim kurulmaz
 *   - Bugün oynanmışsa → yarına planlanır. Oynamış kişiye "oyna" demek
 *     bildirim kapattıran en hızlı şey
 *   - Bugün oynanmamış ama saat geçmişse → yarına planlanır
 *   - Aksi halde → bugün seçilen saate planlanır
 *
 * Metin, bildirimin gösterileceği GÜNE göre seçilir; böylece bugün ve
 * yarın farklı metin görür.
 */
export function planlamaKarariVer(girdi: PlanlamaGirdisi): PlanlamaKarari {
  const { ayar, izinVar, simdi, bugunOynandi, seriGun, korumaHakkiVar } = girdi;

  if (!ayar.acik) return { tur: 'iptal', gerekce: 'kapali' };
  if (!izinVar) return { tur: 'iptal', gerekce: 'izin-yok' };

  const bugunHedef = oGunSaat(simdi, 0, ayar.saat, ayar.dakika);
  const saatGecti = bugunHedef.getTime() <= simdi.getTime();

  const ne = bugunOynandi || saatGecti
    ? oGunSaat(simdi, 1, ayar.saat, ayar.dakika)
    : bugunHedef;

  const mesaj = mesajSec(gunAnahtari(ne), seriGun, korumaHakkiVar);
  return { tur: 'planla', ne, baslik: mesaj.baslik, govde: mesaj.govde };
}
