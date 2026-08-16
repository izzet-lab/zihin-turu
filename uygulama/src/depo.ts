/**
 * İlerleme deposu — tarayıcıda kalıcı, gerekirse bellekte.
 *
 * Üyelik yok (Faz 2). İlerleme yalnızca tarayıcıda saklanır: seri,
 * tam isabet sayacı, günlük kilitler ve son 28 günün sonuç şeridi.
 *
 * localStorage her ortamda çalışmayabilir (gizli sekme, izin kapalı,
 * kota dolu). Böyle bir durumda oyun ÇÖKMEZ: veri belleğe düşer, o
 * oturum boyunca çalışır, sayfa kapanınca kaybolur. Amaç: kayıt
 * tutamamak, oynamayı engellememeli.
 */

export interface Seri {
  son: string | null; // en son oynanan gün (YYYY-MM-DD)
  gun: number; // güncel kesintisiz gün
  enUzun: number;
}

export interface GunlukSonuc {
  fark: number;
  puan: number;
  tarih: string;
}

export type Durum = 'tam' | 'yakin' | 'uzak';

export interface Ilerleme {
  surum: number;
  seri: Seri;
  tam: number; // toplam tam isabet
  gunluk: Record<string, GunlukSonuc>; // "YYYY-MM-DD:seviye" -> sonuç
}

const ANAHTAR = 'zihinturu.v1';

const BOS: Ilerleme = { surum: 1, seri: { son: null, gun: 0, enUzun: 0 }, tam: 0, gunluk: {} };

/** localStorage yoksa bunu kullanırız; oyun yine çalışır. */
let bellek: string | null = null;
let bellegeDustu = false;

function depoOku(): string | null {
  if (bellegeDustu) return bellek;
  try {
    return window.localStorage.getItem(ANAHTAR);
  } catch {
    bellegeDustu = true;
    return bellek;
  }
}

function depoYaz(deger: string): void {
  if (!bellegeDustu) {
    try {
      window.localStorage.setItem(ANAHTAR, deger);
      return;
    } catch {
      bellegeDustu = true;
    }
  }
  bellek = deger;
}

/** İlerlemenin belleğe mi düştüğü (uyarı göstermek için). */
export function kaliciMi(): boolean {
  return !bellegeDustu;
}

export function oku(): Ilerleme {
  const ham = depoOku();
  if (!ham) return { ...BOS, seri: { ...BOS.seri }, gunluk: {} };
  try {
    const v = JSON.parse(ham) as Partial<Ilerleme>;
    return {
      surum: v.surum ?? 1,
      seri: v.seri ?? { son: null, gun: 0, enUzun: 0 },
      tam: v.tam ?? 0,
      gunluk: v.gunluk ?? {},
    };
  } catch {
    return { ...BOS, seri: { ...BOS.seri }, gunluk: {} };
  }
}

export function yaz(il: Ilerleme): void {
  depoYaz(JSON.stringify(il));
}

function gunlukAnahtar(seviye: string, gun: string): string {
  return gun + ':' + seviye;
}

/** Bu gün + seviye için Günün Turu zaten oynandı mı? */
export function gunlukKilitli(seviye: string, gun: string, il = oku()): boolean {
  return !!il.gunluk[gunlukAnahtar(seviye, gun)];
}

function birGunOnce(gun: string): string {
  const d = new Date(gun + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Günün Turu sonucunu işler: günlük kaydı yazar, tam isabet sayacını
 * ve kesintisiz seriyi günceller. Aynı gün ikinci kez çağrılırsa
 * (kilit zaten var) hiçbir şeyi bozmaz.
 */
export function gunlukKaydet(seviye: string, gun: string, sonuc: { fark: number; puan: number }): Ilerleme {
  const il = oku();
  const anahtar = gunlukAnahtar(seviye, gun);
  if (il.gunluk[anahtar]) return il; // zaten kayıtlı, tekrar işleme

  il.gunluk[anahtar] = { fark: sonuc.fark, puan: sonuc.puan, tarih: gun };
  if (sonuc.fark === 0) il.tam += 1;

  // Kesintisiz seri: dün oynandıysa uzar, bugün zaten sayıldıysa durur,
  // arada boşluk varsa sıfırdan başlar.
  const s = il.seri;
  if (s.son === gun) {
    // aynı gün başka seviye — seri günü değişmez
  } else if (s.son === birGunOnce(gun)) {
    s.gun += 1;
    s.son = gun;
  } else {
    s.gun = 1;
    s.son = gun;
  }
  if (s.gun > s.enUzun) s.enUzun = s.gun;

  yaz(il);
  return il;
}

/**
 * Son `adet` günün sonuç şeridi (en eskiden en yeniye). Her gün için
 * o seviyede oynanmışsa durumu, oynanmamışsa null döner.
 */
export function serit(
  seviye: string,
  gun: string,
  adet = 28,
  il = oku(),
): { tarih: string; durum: Durum | null }[] {
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
    const kayit = il.gunluk[g + ':' + seviye];
    let durum: Durum | null = null;
    if (kayit) durum = kayit.fark === 0 ? 'tam' : kayit.fark <= tolerans ? 'yakin' : 'uzak';
    cikti.push({ tarih: g, durum });
  }
  return cikti;
}

/** Bugünün tarihi (YYYY-MM-DD), yerel saat. */
export function bugun(): string {
  const d = new Date();
  const y = d.getFullYear();
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${a}-${g}`;
}
