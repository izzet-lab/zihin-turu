import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * TÜRKÇE BÜYÜK/KÜÇÜK HARF.
 *
 * `toLowerCase()` ve `toUpperCase()` İngilizce kuralı uygular ve
 * Türkçe'de iki harfi bozar:
 *
 *   "İZZET" → "i̇zzet"   i'nin üstünde AYRI bir nokta karakteri kalır
 *   "IŞIK"  → "işik"     ı yerine i
 *
 * Birincisi görünmez: ad ekranda doğru görünür ama içinde fazladan bir
 * karakter vardır. Kullanıcı adı veritabanına bu haliyle yazılıyordu;
 * benzersizlik kontrolü, profil adresi ve arama bu yüzden tutmazdı.
 *
 * Bu test iki şeyi birden tutuyor: davranışın doğruluğunu ve kuralın
 * projede yeniden bozulmamasını.
 */

const KOK = join(import.meta.dirname, '..');

/** Verilen klasördeki tüm .ts/.tsx dosyalarını toplar. */
function kaynakDosyalari(klasor: string, biriken: string[] = []): string[] {
  for (const ad of readdirSync(klasor)) {
    if (ad === 'node_modules' || ad === 'dist' || ad.startsWith('.')) continue;
    const yol = join(klasor, ad);
    if (statSync(yol).isDirectory()) kaynakDosyalari(yol, biriken);
    else if (/\.tsx?$/.test(ad)) biriken.push(yol);
  }
  return biriken;
}

describe('Türkçe küçültme davranışı', () => {
  const turkceKucult = (m: string) => m.toLocaleLowerCase('tr-TR');

  it('noktalı büyük İ, fazladan nokta bırakmadan küçülür', () => {
    expect(turkceKucult('İZZET')).toBe('izzet');
    // İngilizce kuralı bozuyordu — kanıt burada dursun.
    expect('İZZET'.toLowerCase()).not.toBe('izzet');
  });

  it('noktasız büyük I, ı olur', () => {
    expect(turkceKucult('IŞIK')).toBe('ışık');
    expect('IŞIK'.toLowerCase()).not.toBe('ışık');
  });

  it('zaten küçük harfli ad değişmez', () => {
    expect(turkceKucult('çilek_42')).toBe('çilek_42');
  });

  it('e-posta için İngilizce kural doğru kalmalı', () => {
    // E-posta ASCII; Türkçe kural "I" harfini "ı" yapıp adresi bozardı.
    expect('Izzet@Mail.COM'.toLowerCase()).toBe('izzet@mail.com');
  });
});

describe('projede kurala aykırı kullanım yok', () => {
  /**
   * `toLowerCase`/`toUpperCase` yalnızca ASCII verilerde serbest:
   * e-posta, oda kodu ve sunucudan gelen İngilizce hata metinleri.
   * Oyuncunun yazdığı Türkçe metinlerde yasak.
   */
  const IZINLI = [
    // E-posta: ASCII, İngilizce kural doğru.
    'eposta.trim().toLowerCase()',
    "const temiz = eposta.trim().toLowerCase();",
    // Sunucudan gelen İngilizce hata metnini eşlemek için.
    'const m = mesaj.toLowerCase();',
    // Oda kodu: ASCII harf/rakam; Türkçe kural 'i' harfini bozardı.
    "e.target.value.toUpperCase().slice(0, 5)",
  ];

  it('kullanıcı adı gibi Türkçe metinlerde toLowerCase kullanılmıyor', () => {
    const klasorler = [join(KOK, 'uygulama', 'src'), join(KOK, 'paketler')];
    const bulunan: string[] = [];

    for (const klasor of klasorler) {
      for (const dosya of kaynakDosyalari(klasor)) {
        const satirlar = readFileSync(dosya, 'utf8').split(/\r?\n/);
        satirlar.forEach((satir, i) => {
          if (!/\.to(Lower|Upper)Case\(\)/.test(satir)) return;
          // Yorum satırları kuralı anlatıyor olabilir; onlar serbest.
          if (/^\s*(\*|\/\/)/.test(satir)) return;
          if (IZINLI.some((izin) => satir.includes(izin))) return;
          bulunan.push(`${dosya.slice(KOK.length + 1)}:${i + 1} → ${satir.trim()}`);
        });
      }
    }

    expect(
      bulunan,
      'Türkçe metinde toLocaleLowerCase("tr-TR") kullanılmalı:\n' + bulunan.join('\n'),
    ).toEqual([]);
  });
});
