/**
 * Paylaşım kartı — metin ve 1080x1080 görsel.
 *
 * KESİN KURAL (CLAUDE.md 6): Karta çözüm adımları, işlem işaretleri
 * (+ − × ÷) ve ara sonuçlar ASLA girmez. Kartı gören kişi bulmacayı
 * henüz oynamamış olabilir; ona cevabı vermiş oluruz.
 *
 * Bu yüzden kart yalnızca şunları gösterir: hedef sayı (bulmacanın
 * SORUSU, cevabı değil), isabet durumu, süre, puan, seri ve tarih.
 * Adım zinciri buraya hiç gelmez.
 */

export const BOYUT = 1080;

export interface Kayit {
  seviyeEtiket: string;
  hedef: number;
  fark: number;
  puan: number;
  sure: number; // saniye; 0 = süresiz
  gunluk: boolean;
  tarih: string; // YYYY-MM-DD
  seri: number;
}

function tarihGoster(iso: string): string {
  const [y, a, g] = iso.split('-');
  return `${g}.${a}.${y}`;
}

/** Paylaşılabilir düz metin. Adım/işlem/ara sonuç içermez. */
export function kartMetni(k: Kayit): string {
  const satir: string[] = [];
  satir.push(`Sayı Turu${k.gunluk ? ' — Günün Turu' : ''}`);
  satir.push(`${tarihGoster(k.tarih)} · ${k.seviyeEtiket}`);
  if (k.fark === 0) satir.push(`🎯 Hedef ${k.hedef} · Tam isabet`);
  else satir.push(`Hedef ${k.hedef} · ${k.fark} fark`);
  const sureMetni = k.sure > 0 ? `${k.sure} sn · ` : '';
  satir.push(`⏱ ${sureMetni}${k.puan} puan`);
  if (k.gunluk && k.seri > 1) satir.push(`🔥 ${k.seri} günlük seri`);
  satir.push('Herkes bugün aynı turu oynuyor.');
  return satir.join('\n');
}

/* --- Görsel --- */

type Ctx = CanvasRenderingContext2D;

function yuvarlakDikdortgen(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/**
 * Kartı verilen 2B bağlam üzerine çizer. Gerçek bir canvas ya da
 * testte sahte bir bağlam olabilir. Sızıntı testi bu fonksiyonun
 * yazdığı metinleri denetler.
 */
export function kartCiz(c: Ctx, k: Kayit): void {
  const M = BOYUT;
  // Zemin — koyu lacivert
  c.fillStyle = '#0A0E1A';
  c.fillRect(0, 0, M, M);

  // İnce çerçeve kart
  c.strokeStyle = '#1E293B';
  c.lineWidth = 4;
  yuvarlakDikdortgen(c, 70, 70, M - 140, M - 140, 48);
  c.stroke();

  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  // Marka
  c.fillStyle = '#7CEDFB';
  c.font = '700 46px system-ui, sans-serif';
  c.fillText('Zihin Turu', 130, 190);

  c.fillStyle = '#64748B';
  c.font = '500 34px system-ui, sans-serif';
  c.fillText(`Sayı Turu${k.gunluk ? ' · Günün Turu' : ''}`, 130, 240);
  c.fillText(`${tarihGoster(k.tarih)} · ${k.seviyeEtiket}`, 130, 288);

  // Hedef — büyük (bulmacanın sorusu)
  c.fillStyle = '#94A3B8';
  c.font = '600 40px system-ui, sans-serif';
  c.fillText('HEDEF', 130, 430);
  c.fillStyle = '#F1F5F9';
  c.font = '800 200px system-ui, sans-serif';
  c.fillText(String(k.hedef), 130, 620);

  // İsabet durumu
  if (k.fark === 0) {
    c.fillStyle = '#7CEDFB';
    c.font = '800 72px system-ui, sans-serif';
    c.fillText('TAM İSABET 🎯', 130, 740);
  } else {
    c.fillStyle = '#94A3B8';
    c.font = '700 64px system-ui, sans-serif';
    c.fillText(`${k.fark} FARK`, 130, 740);
  }

  // Alt kutular: süre, puan, (seri)
  const kutular: { ust: string; alt: string }[] = [];
  if (k.sure > 0) kutular.push({ ust: 'SÜRE', alt: `${k.sure} sn` });
  kutular.push({ ust: 'PUAN', alt: `${k.puan}` });
  if (k.gunluk && k.seri > 1) kutular.push({ ust: 'SERİ', alt: `${k.seri} gün` });

  const kutuG = 250;
  const kutuY = 770;
  kutular.forEach((kt, i) => {
    const x = 130 + i * (kutuG + 24);
    c.strokeStyle = '#1E293B';
    c.lineWidth = 3;
    yuvarlakDikdortgen(c, x, kutuY, kutuG, 150, 24);
    c.stroke();
    c.fillStyle = '#64748B';
    c.font = '600 30px system-ui, sans-serif';
    c.fillText(kt.ust, x + 28, kutuY + 56);
    c.fillStyle = '#E2E8F0';
    c.font = '800 56px system-ui, sans-serif';
    c.fillText(kt.alt, x + 28, kutuY + 118);
  });

  // Alt bilgi
  c.fillStyle = '#475569';
  c.font = '500 30px system-ui, sans-serif';
  c.fillText('Herkes bugün aynı turu oynuyor.', 130, M - 95);
}

/** Tarayıcıda gerçek bir 1080x1080 PNG üretir. */
export async function kartGorsel(k: Kayit): Promise<Blob | null> {
  const tuval = document.createElement('canvas');
  tuval.width = BOYUT;
  tuval.height = BOYUT;
  const c = tuval.getContext('2d');
  if (!c) return null;
  kartCiz(c, k);
  return new Promise((coz) => tuval.toBlob((b) => coz(b), 'image/png'));
}

/** Görseli veri-URL olarak döndürür (önizleme için). */
export function kartDataUrl(k: Kayit): string | null {
  const tuval = document.createElement('canvas');
  tuval.width = BOYUT;
  tuval.height = BOYUT;
  const c = tuval.getContext('2d');
  if (!c) return null;
  kartCiz(c, k);
  return tuval.toDataURL('image/png');
}
