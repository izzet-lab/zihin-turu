/**
 * Ses efektleri — Web Audio API ile, dosya indirmeden üretilir.
 *
 * Hiçbir ses dosyası yok; kısa osilatör tonları kod içinde çalınıyor.
 * Bu yüzden ek yükleme yok, PWA çevrimdışı bile çalışır.
 *
 * MOBİL KİLİDİ: Telefon tarayıcıları (özellikle iOS Safari) ses
 * bağlamını yalnızca GERÇEK bir kullanıcı dokunuşunun içinde açar.
 * `resume()` asenkron olduğu için, ilk sesi doğrudan çalmaya çalışmak
 * güvenilmez — bağlam hâlâ "suspended" iken zamanlanan ton kaçar.
 * Çözüm: uygulama açılışında `sesKilidiKur()` çağrılır; bu, ilk
 * dokunuşta bağlamı açar ve iOS için kısa bir sessiz tampon çalar.
 * Böylece oyun sesleri geldiğinde bağlam zaten çalışır durumdadır.
 */

import { sesAcikMi } from './depo';

let baglam: AudioContext | null = null;

function baglamAl(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!baglam) baglam = new Ctor();
  return baglam;
}

/**
 * İlk gerçek dokunuşta ses bağlamının kilidini açar. Uygulama
 * açılışında bir kez çağrılır. Programatik tık (test) bunu açmaz;
 * yalnızca gerçek bir kullanıcı jesti açar — tarayıcı kuralı budur.
 */
export function sesKilidiKur(): void {
  if (typeof window === 'undefined') return;
  let acildi = false;
  const ac = () => {
    if (acildi) return;
    const b = baglamAl();
    if (!b) return;
    if (b.state === 'suspended') b.resume().catch(() => {});
    // iOS kilidi: bir örneklik sessiz tampon çalmak bağlamı uyandırır.
    try {
      const tampon = b.createBuffer(1, 1, 22050);
      const kaynak = b.createBufferSource();
      kaynak.buffer = tampon;
      kaynak.connect(b.destination);
      kaynak.start(0);
    } catch {
      /* önemsiz */
    }
    acildi = true;
    window.removeEventListener('pointerdown', ac);
    window.removeEventListener('touchstart', ac);
    window.removeEventListener('keydown', ac);
  };
  window.addEventListener('pointerdown', ac);
  window.addEventListener('touchstart', ac);
  window.addEventListener('keydown', ac);
}

function ton(
  frekans: number,
  sure: number,
  gecikme = 0,
  hacim = 0.16,
  dalga: OscillatorType = 'sine',
): void {
  if (!sesAcikMi()) return;
  const b = baglamAl();
  if (!b) return;
  // Bağlam bir sebeple hâlâ askıdaysa uyandırmayı dene (kilit
  // kurulmadıysa ya da tarayıcı geri askıya aldıysa).
  if (b.state === 'suspended') b.resume().catch(() => {});
  // Küçük bir ileri offset: "geçmişe" zamanlanan ton hiç duyulmaz.
  const simdi = b.currentTime + gecikme + 0.01;
  const osc = b.createOscillator();
  const kazanc = b.createGain();
  osc.type = dalga;
  osc.frequency.setValueAtTime(frekans, simdi);
  kazanc.gain.setValueAtTime(0.0001, simdi);
  kazanc.gain.linearRampToValueAtTime(hacim, simdi + 0.012);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + sure);
  osc.connect(kazanc);
  kazanc.connect(b.destination);
  osc.start(simdi);
  osc.stop(simdi + sure + 0.02);
}

/** Taş seçildiğinde — kısa, hafif tık. */
export function sesTasSec(): void {
  ton(520, 0.07, 0, 0.12);
}

/** İki taş başarıyla birleştirildiğinde — yükselen çift ton. */
export function sesBirlestir(): void {
  ton(440, 0.1, 0, 0.18);
  ton(660, 0.12, 0.06, 0.18);
}

/** Geçersiz işlem denendiğinde — kısa, pes uyarı. */
export function sesHata(): void {
  ton(160, 0.18, 0, 0.16, 'triangle');
}

/** Tam isabet — kısa bir zafer arpeji. */
export function sesTamIsabet(): void {
  [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.24, i * 0.09, 0.2));
}

/** Joker kullanıldığında — nötr, bilgilendirici tık. */
export function sesJoker(): void {
  ton(300, 0.12, 0, 0.14, 'triangle');
}

/**
 * Geri sayımın son saniyeleri — hafif bir tik. Son saniyede (0'a
 * inerken) biraz daha belirgin, tiz bir uyarı çalınır. Baskı değil,
 * yalnızca "süre bitiyor" bilgisi; bu yüzden yalnızca son birkaç
 * saniyede duyulur, sürekli değil.
 */
export function sesGeriSayim(sonSaniye = false): void {
  if (sonSaniye) ton(880, 0.16, 0, 0.2, 'sine');
  else ton(660, 0.06, 0, 0.11, 'triangle');
}
