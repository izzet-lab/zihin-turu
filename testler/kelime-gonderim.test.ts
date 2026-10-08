import { describe, it, expect } from 'vitest';
import { gunlukTohum } from '@tamisabet/cekirdek';
import { kelimeGonderimDogrula, enFazlaHarf } from '@tamisabet/oyun-kelime';

/*
  KELİME GÖNDERİM DENETİMİ

  İstemci düşmandır. Sunucu kelimeyi zaten sıfırdan doğruluyor; bu
  testler hesabın GİRDİLERİNİ sınıyor: uydurma süre puanı şişirir,
  geçmiş tarih lig geçmişini doldurur, dev gövde sunucuyu meşgul eder.
*/

const SIMDI = Date.parse('2026-10-08T12:00:00Z');
const BUGUN = '2026-10-08';

function girdi(ek: Record<string, unknown> = {}) {
  return {
    oyun: 'kelime',
    mod: 'gunun',
    seviye: 'normal',
    tarih: BUGUN,
    tohum: 12345,
    kelime: 'kitap',
    sureSn: 60,
    kalanSn: 20,
    simdiMs: SIMDI,
    ...ek,
  };
}

describe('kelime gönderim denetimi', () => {
  it('geçerli gönderim kabul edilir', () => {
    expect(kelimeGonderimDogrula(girdi())).toBeNull();
  });

  it('boş kelime geçerli — oyuncu bulamadan süre bitmiş olabilir', () => {
    expect(kelimeGonderimDogrula(girdi({ kelime: '' }))).toBeNull();
  });

  it('başka oyun reddedilir', () => {
    expect(kelimeGonderimDogrula(girdi({ oyun: 'sayi' }))).toBe('Bilinmeyen oyun.');
  });

  it('bilinmeyen seviye reddedilir', () => {
    expect(kelimeGonderimDogrula(girdi({ seviye: 'efsane' }))).toBe('Bilinmeyen seviye.');
  });

  it('geçmiş tarihli gönderim reddedilir', () => {
    // Lig geçmişini doldurmanın yolu budur.
    expect(kelimeGonderimDogrula(girdi({ tarih: '2026-09-01' }))).toBe('Tarih bugüne ait değil.');
  });

  it('bir günlük pay var — gece yerel/UTC farkı için', () => {
    expect(kelimeGonderimDogrula(girdi({ tarih: '2026-10-09' }))).toBeNull();
  });

  it('havuzdan uzun kelime erkenden elenir', () => {
    const uzun = 'a'.repeat(enFazlaHarf('normal') + 1);
    expect(kelimeGonderimDogrula(girdi({ kelime: uzun }))).toMatch(/harf sayısından uzun/);
  });

  it('kalan süre toplam süreyi aşamaz', () => {
    // Aşsaydı hız primi şişerdi.
    expect(kelimeGonderimDogrula(girdi({ kalanSn: 120 }))).toBe(
      'Kalan süre toplam süreyi aşamaz.',
    );
  });

  it('sıfır ve negatif süre reddedilir', () => {
    expect(kelimeGonderimDogrula(girdi({ sureSn: 0 }))).toBe('Geçersiz süre.');
    expect(kelimeGonderimDogrula(girdi({ sureSn: -5 }))).toBe('Geçersiz süre.');
  });

  it('sayı olmayan tohum reddedilir', () => {
    expect(kelimeGonderimDogrula(girdi({ tohum: 'abc' }))).toBe('Geçersiz tohum.');
  });

  it('geçersiz mod reddedilir', () => {
    expect(kelimeGonderimDogrula(girdi({ mod: 'duello' }))).toBe('Geçersiz mod.');
  });
});

describe('günün kelime turu tohumu', () => {
  it('tarihten ve seviyeden türer, her makinede aynı', () => {
    expect(gunlukTohum('kelime', 'normal', BUGUN)).toBe(gunlukTohum('kelime', 'normal', BUGUN));
  });

  it('sayı turunun tohumundan farklıdır', () => {
    // Aynı olsaydı iki oyun aynı tohumu paylaşır, "oyun" alanı
    // anlamsızlaşırdı.
    expect(gunlukTohum('kelime', 'normal', BUGUN)).not.toBe(
      gunlukTohum('sayi', 'normal', BUGUN),
    );
  });

  it('her seviye ayrı bulmaca alır', () => {
    expect(gunlukTohum('kelime', 'zor', BUGUN)).not.toBe(gunlukTohum('kelime', 'normal', BUGUN));
  });
});
