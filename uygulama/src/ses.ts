/**
 * Ses efektleri — Web Audio API ile, dosya indirmeden üretilir.
 *
 * Hiçbir ses dosyası yok; kısa osilatör tonları kod içinde çalınıyor.
 * Bu yüzden ek yükleme yok, PWA çevrimdışı bile çalışır. Tarayıcı ses
 * bağlamını yalnızca kullanıcı bir etkileşimde bulununca açabildiği
 * için (autoplay kısıtı), bağlam ilk çalma anında kurulur.
 */

let baglam: AudioContext | null = null;

function baglamAl(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!baglam) baglam = new Ctor();
  if (baglam.state === 'suspended') baglam.resume().catch(() => {});
  return baglam;
}

function ton(frekans: number, sure: number, gecikme = 0, hacim = 0.09, dalga: OscillatorType = 'sine'): void {
  const b = baglamAl();
  if (!b) return;
  const simdi = b.currentTime + gecikme;
  const osc = b.createOscillator();
  const kazanc = b.createGain();
  osc.type = dalga;
  osc.frequency.setValueAtTime(frekans, simdi);
  kazanc.gain.setValueAtTime(0, simdi);
  kazanc.gain.linearRampToValueAtTime(hacim, simdi + 0.012);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + sure);
  osc.connect(kazanc);
  kazanc.connect(b.destination);
  osc.start(simdi);
  osc.stop(simdi + sure + 0.02);
}

/** Taş seçildiğinde — kısa, hafif tık. */
export function sesTasSec(): void {
  ton(520, 0.06, 0, 0.05);
}

/** İki taş başarıyla birleştirildiğinde — yükselen çift ton. */
export function sesBirlestir(): void {
  ton(440, 0.09, 0, 0.07);
  ton(660, 0.11, 0.06, 0.07);
}

/** Geçersiz işlem denendiğinde — kısa, pes uyarı. */
export function sesHata(): void {
  ton(160, 0.16, 0, 0.06, 'triangle');
}

/** Tam isabet — kısa bir zafer arpeji. */
export function sesTamIsabet(): void {
  [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.22, i * 0.08, 0.08));
}

/** Joker kullanıldığında — nötr, bilgilendirici tık. */
export function sesJoker(): void {
  ton(300, 0.1, 0, 0.05, 'triangle');
}
