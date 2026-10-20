import { describe, it, expect } from 'vitest';
import {
  gorunenAdTemizle,
  isimDogrula,
  isimUygunsuzMu,
  kullaniciAdiAdaylari,
  kullaniciAdiKoku,
  KULLANICI_ADI_EN_COK,
} from '../uygulama/src/isim-karar';

/*
  İsimle giriş (sistem 2): oyuncu yalnızca ismini yazar, kullanıcı adı
  ondan üretilir. "Nazım" → "nazim". Üretilen ad veritabanının CHECK
  kısıtına (3–16 karakter, boşluk yok) uymazsa kayıt sessizce düşer;
  bu testler o sınırları koruyor.
*/

describe('isimden kullanıcı adı kökü', () => {
  it('Türkçe karakterler ASCII karşılığına iner', () => {
    expect(kullaniciAdiKoku('Nazım')).toBe('nazim');
    expect(kullaniciAdiKoku('Şükrü')).toBe('sukru');
    expect(kullaniciAdiKoku('Gülçin Öğüt')).toBe('gulcinogut');
  });

  it('büyük İ ve I Türkçe kuralıyla küçülür', () => {
    expect(kullaniciAdiKoku('İREM')).toBe('irem');
    expect(kullaniciAdiKoku('IŞIK')).toBe('isik');
  });

  it('boşluk ve işaretler atılır, rakam kalır', () => {
    expect(kullaniciAdiKoku('  Ali  Can! ')).toBe('alican');
    expect(kullaniciAdiKoku('Ece_99')).toBe('ece99');
  });
});

describe('denenecek kullanıcı adları', () => {
  it('önce kök, sonra sayılı hâlleri', () => {
    expect(kullaniciAdiAdaylari('Nazım', 3)).toEqual(['nazim', 'nazim2', 'nazim3']);
  });

  it('iki harfli isim sayıyla başlar', () => {
    expect(kullaniciAdiAdaylari('Su', 2)).toEqual(['su1', 'su2']);
  });

  it('uzun isimde hiçbir aday sınırı aşmaz', () => {
    const adaylar = kullaniciAdiAdaylari('Muhammed Mustafa Abdurrahman', 15);
    expect(adaylar[0]).toBe('muhammedmustafaa');
    for (const a of adaylar) expect(a.length).toBeLessThanOrEqual(KULLANICI_ADI_EN_COK);
    expect(adaylar).toContain('muhammedmustaf12');
    expect(new Set(adaylar).size).toBe(adaylar.length);
  });

  it('kök boşsa aday yok', () => {
    expect(kullaniciAdiAdaylari('!!!')).toEqual([]);
  });
});

describe('isim doğrulama ve görünen ad', () => {
  it('görünen ad Türkçe kalır, boşluklar toparlanır', () => {
    expect(gorunenAdTemizle('  Nazım   Demir ')).toBe('Nazım Demir');
  });

  it('görünen ad 32 karakteri aşmaz', () => {
    expect(gorunenAdTemizle('a'.repeat(50)).length).toBe(32);
  });

  it('boş ve tek harfli isim reddedilir', () => {
    expect(isimDogrula('   ')).not.toBeNull();
    expect(isimDogrula('A')).not.toBeNull();
    expect(isimDogrula('Su')).toBeNull();
    expect(isimDogrula('Nazım')).toBeNull();
  });
});

describe('isimde küfür süzgeci', () => {
  const liste = ['sik', 'oç', 'orospu', 'amk'];

  it('gerçek isimler geçer', () => {
    expect(isimUygunsuzMu('Oğuz Koç', liste)).toBe(false);
    expect(isimUygunsuzMu('Işık', liste)).toBe(false);
    expect(isimUygunsuzMu('Nazım', liste)).toBe(false);
  });

  it('küfrün kendisi ve uzun maddenin türevi yakalanır', () => {
    expect(isimUygunsuzMu('amk', liste)).toBe(true);
    expect(isimUygunsuzMu('Ali OÇ', liste)).toBe(true);
    expect(isimUygunsuzMu('orospuçocuğu', liste)).toBe(true);
  });
});
