/**
 * İlerleme deposu — tarayıcıda kalıcı, gerekirse bellekte.
 *
 * Üyelik yok (Faz 2). İlerleme yalnızca tarayıcıda saklanır: seri,
 * tam isabet sayacı, günlük kilit, son 28 günün sonuç şeridi ve
 * açılmış seviyeler.
 *
 * localStorage her ortamda çalışmayabilir (gizli sekme, izin kapalı,
 * kota dolu). Böyle bir durumda oyun ÇÖKMEZ: veri belleğe düşer, o
 * oturum boyunca çalışır, sayfa kapanınca kaybolur. Amaç: kayıt
 * tutamamak, oynamayı engellememeli.
 */

import { SEVIYE_ANAHTARLARI } from '@zihinturu/oyun-sayi';

export interface Seri {
  son: string | null; // en son oynanan gün (YYYY-MM-DD)
  gun: number; // güncel kesintisiz gün
  enUzun: number;
}

export interface GunlukSonuc {
  fark: number;
  puan: number;
  seviye: string;
  tarih: string;
}

export type Durum = 'tam' | 'yakin' | 'uzak';

export interface Ilerleme {
  surum: number;
  seri: Seri;
  tam: number; // toplam tam isabet
  /** Günün Turu günde tek — anahtar yalnızca tarih (seviye başına değil). */
  gunluk: Record<string, GunlukSonuc>;
  /** Açılmış seviye anahtarları. İlk kez oynayan yalnızca ["cocuk"] ile başlar. */
  acikSeviyeler: string[];
}

const ANAHTAR = 'zihinturu.v2';
const ESKI_ANAHTAR = 'zihinturu.v1'; // sürüm 1: gunluk "tarih:seviye" anahtarlıydı

const BOS = (): Ilerleme => ({
  surum: 2,
  seri: { son: null, gun: 0, enUzun: 0 },
  tam: 0,
  gunluk: {},
  acikSeviyeler: ['cocuk'],
});

/** localStorage yoksa bunu kullanırız; oyun yine çalışır. */
const bellekHaritasi = new Map<string, string>();
let bellegeDustu = false;

function genelOku(anahtar: string): string | null {
  if (bellegeDustu) return bellekHaritasi.get(anahtar) ?? null;
  try {
    return window.localStorage.getItem(anahtar);
  } catch {
    bellegeDustu = true;
    return bellekHaritasi.get(anahtar) ?? null;
  }
}

function genelYaz(anahtar: string, deger: string): void {
  if (!bellegeDustu) {
    try {
      window.localStorage.setItem(anahtar, deger);
      return;
    } catch {
      bellegeDustu = true;
    }
  }
  bellekHaritasi.set(anahtar, deger);
}

function depoOku(): string | null {
  return genelOku(ANAHTAR);
}

function depoYaz(deger: string): void {
  genelYaz(ANAHTAR, deger);
}

/** İlerlemenin belleğe mi düştüğü (uyarı göstermek için). */
export function kaliciMi(): boolean {
  return !bellegeDustu;
}

/**
 * Sürüm 1'in "tarih:seviye" anahtarlı günlük kaydını yeni tarih-tek
 * yapıya çevirir. Bir günde birden fazla seviye oynanmışsa tam isabet
 * olanı, yoksa hedefe en yakın olanı tutar. Eski kayıt silinmez — bu
 * fonksiyon yalnızca okurken bir kerelik dönüştürme yapar.
 */
export function eskiGunlukDonustur(eski: Record<string, { fark: number; puan: number; tarih?: string }>): Record<string, GunlukSonuc> {
  const yeni: Record<string, GunlukSonuc> = {};
  for (const [anahtar, deger] of Object.entries(eski)) {
    const ikiNokta = anahtar.indexOf(':');
    const tarih = ikiNokta >= 0 ? anahtar.slice(0, ikiNokta) : anahtar;
    const seviye = ikiNokta >= 0 ? anahtar.slice(ikiNokta + 1) : 'normal';
    const mevcut = yeni[tarih];
    if (!mevcut || deger.fark < mevcut.fark) {
      yeni[tarih] = { fark: deger.fark, puan: deger.puan, seviye, tarih };
    }
  }
  return yeni;
}

/** Sürüm 1'den kalan veriyi bir kerelik okuyup yeni yapıya çevirir. */
function eskiSurumuGoc(): Ilerleme | null {
  const ham = genelOku(ESKI_ANAHTAR);
  if (!ham) return null;
  try {
    const v = JSON.parse(ham) as {
      seri?: Seri;
      tam?: number;
      gunluk?: Record<string, { fark: number; puan: number; tarih?: string }>;
    };
    const gunluk = eskiGunlukDonustur(v.gunluk ?? {});
    // Eski kullanıcı zaten oynamış sayılır: tüm seviyeler açık gelir,
    // ilk-kez-oynayan kısıtlaması ona uygulanmaz.
    return {
      surum: 2,
      seri: v.seri ?? { son: null, gun: 0, enUzun: 0 },
      tam: v.tam ?? 0,
      gunluk,
      acikSeviyeler: [...SEVIYE_ANAHTARLARI],
    };
  } catch {
    return null;
  }
}

export function oku(): Ilerleme {
  const ham = depoOku();
  if (ham) {
    try {
      const v = JSON.parse(ham) as Partial<Ilerleme>;
      return {
        surum: v.surum ?? 2,
        seri: v.seri ?? { son: null, gun: 0, enUzun: 0 },
        tam: v.tam ?? 0,
        gunluk: v.gunluk ?? {},
        // Alan yoksa (v2'den önceki bir ara kayıt) var olan geçmişe
        // bakarak karar ver: geçmişi olan biri "yeni oyuncu" sayılmaz.
        acikSeviyeler: v.acikSeviyeler ?? (hicOynamamisMi(v) ? ['cocuk'] : [...SEVIYE_ANAHTARLARI]),
      };
    } catch {
      return BOS();
    }
  }
  // v2 kaydı yok; v1'den göç edilecek bir şey var mı bak.
  const goc = eskiSurumuGoc();
  if (goc) {
    yaz(goc);
    return goc;
  }
  return BOS();
}

export function hicOynamamisMi(v: Partial<Ilerleme>): boolean {
  const gunlukBos = !v.gunluk || Object.keys(v.gunluk).length === 0;
  const tamSifir = !v.tam || v.tam === 0;
  const seriYok = !v.seri || v.seri.son == null;
  return gunlukBos && tamSifir && seriYok;
}

export function yaz(il: Ilerleme): void {
  depoYaz(JSON.stringify(il));
}

function birGunOnce(gun: string): string {
  const d = new Date(gun + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Bugün Günün Turu zaten oynandı mı? Seviyeden bağımsız — günde tek hak. */
export function gunlukKilitli(gun: string, il = oku()): boolean {
  return !!il.gunluk[gun];
}

/**
 * Günün Turu sonucunu işler: günlük kaydı yazar, tam isabet sayacını
 * ve kesintisiz seriyi günceller. Aynı gün ikinci kez çağrılırsa
 * (kilit zaten var) hiçbir şeyi bozmaz.
 */
export function gunlukKaydet(gun: string, seviye: string, sonuc: { fark: number; puan: number }): Ilerleme {
  const il = oku();
  if (il.gunluk[gun]) return il; // bugün için zaten kayıtlı

  il.gunluk[gun] = { fark: sonuc.fark, puan: sonuc.puan, seviye, tarih: gun };
  if (sonuc.fark === 0) il.tam += 1;

  // Kesintisiz seri: dün oynandıysa uzar, arada boşluk varsa sıfırdan başlar.
  const s = il.seri;
  if (s.son === birGunOnce(gun)) {
    s.gun += 1;
    s.son = gun;
  } else if (s.son !== gun) {
    s.gun = 1;
    s.son = gun;
  }
  if (s.gun > s.enUzun) s.enUzun = s.gun;

  yaz(il);
  return il;
}

/**
 * Son `adet` günün sonuç şeridi (en eskiden en yeniye), genel —
 * seviyeden bağımsız. Her gün için o gün Günün Turu oynanmışsa
 * durumu, oynanmamışsa null döner.
 */
export function serit(gun: string, adet = 28, il = oku()): { tarih: string; durum: Durum | null }[] {
  const tolerans = 8; // "yakın" eşiği; sadece şerit rengi için kabaca
  const cikti: { tarih: string; durum: Durum | null }[] = [];
  let t = gun;
  const gunler: string[] = [];
  for (let i = 0; i < adet; i++) {
    gunler.push(t);
    t = birGunOnce(t);
  }
  gunler.reverse();
  for (const g of gunler) {
    const kayit = il.gunluk[g];
    let durum: Durum | null = null;
    if (kayit) durum = kayit.fark === 0 ? 'tam' : kayit.fark <= tolerans ? 'yakin' : 'uzak';
    cikti.push({ tarih: g, durum });
  }
  return cikti;
}

/* --- Seviye kilidi (ilk kez oynayan için) --- */

/** Açılmış seviye anahtarları, kolaydan zora sıralı. */
export function acikSeviyeler(il = oku()): string[] {
  return il.acikSeviyeler;
}

/** Bir seviye açık mı (oynanabilir mi)? */
export function seviyeAcikMi(seviye: string, il = oku()): boolean {
  return il.acikSeviyeler.includes(seviye);
}

/**
 * Bir sonraki seviyeyi açar (zaten açıksa bir şey değişmez). Yalnızca
 * ilk kez oynayan öğrencinin ilerlemesi bunu tetikler: bir seviyede
 * tam isabet yapınca bir üst seviye açılır.
 */
export function seviyeAc(seviye: string): Ilerleme {
  const il = oku();
  if (il.acikSeviyeler.includes(seviye)) return il;
  il.acikSeviyeler = [...il.acikSeviyeler, seviye];
  yaz(il);
  return il;
}

/* --- Antrenman ayarları hatırlama --- */
/* Antrenmanın amacı arka arkaya oynamak; her turda seviye/süre/büyük  */
/* sayıyı yeniden seçmek bu akışı kırar. Son kullanılan ayar saklanır  */
/* ve hem "Yeni tur" düğmesinde hem de Kurulum ekranı yeniden          */
/* açıldığında (uygulama kapatılıp açılsa bile) varsayılan olur.       */

const ANTRENMAN_ANAHTAR = 'zihinturu.antrenman.v1';

export interface AntrenmanAyari {
  seviye: string;
  sure: number; // saniye; 0 = süresiz
  buyukAdet: number;
}

/** Son kullanılan Antrenman ayarı, hiç oynanmadıysa null. */
export function sonAntrenmanAyariOku(): AntrenmanAyari | null {
  const ham = genelOku(ANTRENMAN_ANAHTAR);
  if (!ham) return null;
  try {
    return JSON.parse(ham) as AntrenmanAyari;
  } catch {
    return null;
  }
}

export function sonAntrenmanAyariYaz(a: AntrenmanAyari): void {
  genelYaz(ANTRENMAN_ANAHTAR, JSON.stringify(a));
}

/* --- Yardım / ilk tanıtım --- */

const YARDIM_ANAHTAR = 'zihinturu.yardim.v1';

/** İlk tanıtım daha önce görüldü mü? */
export function yardimGoruldu(): boolean {
  return genelOku(YARDIM_ANAHTAR) === '1';
}

/** İlk tanıtımı görüldü olarak işaretle (bir daha kendiliğinden açılmaz). */
export function yardimGorulduIsaretle(): void {
  genelYaz(YARDIM_ANAHTAR, '1');
}

/* --- Ses tercihi --- */

const SES_ANAHTAR = 'zihinturu.ses.v1';

/** Ses efektleri açık mı? Kayıt yoksa varsayılan açıktır. */
export function sesAcikMi(): boolean {
  return genelOku(SES_ANAHTAR) !== '0';
}

/** Ses tercihini kaydeder; sonraki açılışta da geçerli olur. */
export function sesTercihiYaz(acik: boolean): void {
  genelYaz(SES_ANAHTAR, acik ? '1' : '0');
}

/** Bugünün tarihi (YYYY-MM-DD), yerel saat. */
export function bugun(): string {
  const d = new Date();
  const y = d.getFullYear();
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${a}-${g}`;
}
