import { describe, it, expect } from 'vitest';
import { yasDurumu } from '../uygulama/src/yas-karar';

/*
  Kural 6: asgari yaş 13, 13–17 arası veli onayı zorunlu. İsimle giriş
  (sistem 2) e-postayı kaldırdı ama yaş kapısını kaldırmadı; iki ekran
  bu tek kuralı kullanıyor.
*/

describe('yaş kapısı', () => {
  it('boş ve geçersiz yıl ayrılır', () => {
    expect(yasDurumu('', 2026).tur).toBe('bos');
    expect(yasDurumu('1900', 2026).tur).toBe('gecersiz');
    expect(yasDurumu('2030', 2026).tur).toBe('gecersiz');
    expect(yasDurumu('abc', 2026).tur).toBe('gecersiz');
  });

  it('13 altı engellenir, 13–17 veli onayı ister, 18 ve üstü geçer', () => {
    expect(yasDurumu('2014', 2026).tur).toBe('kucuk');
    expect(yasDurumu('2013', 2026).tur).toBe('veli');
    expect(yasDurumu('2009', 2026).tur).toBe('veli');
    expect(yasDurumu('2008', 2026).tur).toBe('yetiskin');
  });
});
