/**
 * Ses efektleri — Web Audio API ile, dosya indirmeden üretilir.
 *
 * Hiçbir ses dosyası yok; tonlar kod içinde üretiliyor. Bu yüzden ek
 * yükleme yok, PWA çevrimdışı bile çalışır.
 *
 * DOKU (24 Ağustos 2026)
 * Önceden her ses tek bir osilatördü — saf sinüs. Doğru notaydı ama
 * "bip" gibi duyuluyordu: enstrüman değil, sinyal. Üç şey eklendi ve
 * hiçbiri dosya gerektirmiyor:
 *
 *   1. Çift osilatör, hafif akort kaymasıyla. İki ses birbirine karşı
 *      çok az kaydığında ton "kalınlaşır"; tek osilatörün ince,
 *      elektronik tınısı gider.
 *   2. Alçak geçiren süzgeç. Tiz kenarları yumuşatır, ses kulağı
 *      tırmalamaz.
 *   3. Kısa yankı. Sesin bittiği yerde küçük bir kuyruk bırakır;
 *      kuyruk olmayan ses kapalı kutuda çalıyormuş gibi durur.
 *      Yankı odası da kodla üretiliyor (gürültü + sönüm), dosya yok.
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

/**
 * İkinci osilatörün akort kayması (sent). Küçük olmalı: 8-12 arası
 * "kalınlık" verir, daha fazlası akortsuz duyulur.
 */
const KAYMA_SENT = 9;

/** Çift osilatörle kalınlaştırılacak dalga biçimleri. */
const KALIN_TONLAR = new Set<OscillatorType>(['sine', 'triangle']);

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

/* ── Ana zincir ve yankı ── */

let anaKazanc: GainNode | null = null;
let yankiGirisi: GainNode | null = null;

/**
 * Yankı odasının darbe yanıtını üretir: kısa bir gürültü patlaması
 * üstel olarak sönümlenir. Küçük bir oda etkisi verir — katedral
 * değil, sadece "boşlukta çalıyor" hissi.
 */
function yankiOdasiUret(b: AudioContext, saniye = 0.9, sonum = 3.2): AudioBuffer {
  const uzunluk = Math.max(1, Math.floor(b.sampleRate * saniye));
  const tampon = b.createBuffer(2, uzunluk, b.sampleRate);
  for (let kanal = 0; kanal < 2; kanal++) {
    const veri = tampon.getChannelData(kanal);
    for (let i = 0; i < uzunluk; i++) {
      // Math.random burada güvenli: ses dokusu oyun kuralı değil,
      // deterministik olması gerekmiyor.
      veri[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / uzunluk, sonum);
    }
  }
  return tampon;
}

/** Ana çıkış ve yankı yolunu bir kez kurar. */
function zinciriKur(b: AudioContext): void {
  if (anaKazanc) return;
  anaKazanc = b.createGain();
  anaKazanc.gain.value = 1;
  anaKazanc.connect(b.destination);

  try {
    const yanki = b.createConvolver();
    yanki.buffer = yankiOdasiUret(b);
    const yankiKazanc = b.createGain();
    // Az miktarda: ses ıslak değil, yalnızca kuru olmasın.
    yankiKazanc.gain.value = 0.22;
    yankiGirisi = b.createGain();
    yankiGirisi.connect(yanki);
    yanki.connect(yankiKazanc);
    yankiKazanc.connect(anaKazanc);
  } catch {
    // Convolver desteklenmiyorsa ses yankısız çalar; sorun değil.
    yankiGirisi = null;
  }
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
  zinciriKur(b);
  const simdi = b.currentTime + gecikme + 0.01;

  const kazanc = b.createGain();
  kazanc.gain.setValueAtTime(0.0001, simdi);
  kazanc.gain.linearRampToValueAtTime(hacim, simdi + 0.012);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, simdi + sure);

  // Alçak geçiren süzgeç: tiz kenarları yumuşatır.
  let cikis: AudioNode = kazanc;
  try {
    const suzgec = b.createBiquadFilter();
    suzgec.type = 'lowpass';
    // Kesim frekansı tonla birlikte yükselsin ki pes sesler boğuk,
    // tiz sesler cılız kalmasın.
    suzgec.frequency.setValueAtTime(Math.min(12000, frekans * 4 + 800), simdi);
    suzgec.Q.value = 0.7;
    kazanc.connect(suzgec);
    cikis = suzgec;
  } catch {
    /* süzgeç yoksa doğrudan devam */
  }

  cikis.connect(anaKazanc ?? b.destination);
  if (yankiGirisi) cikis.connect(yankiGirisi);

  // Çift osilatör: ikincisi çok az kaymış akortta, ton kalınlaşsın.
  const kaymalar = KALIN_TONLAR.has(dalga) ? [0, KAYMA_SENT] : [0];
  const oscler: OscillatorNode[] = [];
  for (const sent of kaymalar) {
    const osc = b.createOscillator();
    osc.type = dalga;
    osc.frequency.setValueAtTime(frekans, simdi);
    if (sent !== 0) osc.detune.setValueAtTime(sent, simdi);
    osc.connect(kazanc);
    osc.start(simdi);
    osc.stop(simdi + sure + 0.02);
    oscler.push(osc);
  }

  // Son osilatör bitince düğümleri bırak; uzun oturumda birikmesin.
  const sonuncu = oscler[oscler.length - 1];
  if (sonuncu) {
    sonuncu.onended = () => {
      try {
        kazanc.disconnect();
        if (cikis !== kazanc) cikis.disconnect();
      } catch {
        /* zaten kopmuş olabilir */
      }
    };
  }
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
