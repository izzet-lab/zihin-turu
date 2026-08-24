import { describe, it, expect } from 'vitest';
import { seriKorumaHakkiVarMi, seriKorumaHakkiKullan } from '../uygulama/src/depo';

/**
 * Seri koruma hakkı ayda birdir.
 *
 * Yardım ekranı bunu böyle anlatıyordu ama kodda hiçbir sınır yoktu —
 * seri her kırıldığında koruma tekrar tekrar teklif ediliyordu. Sınır
 * artık depoda; bu testler onu koruyor.
 *
 * Bu dosya kendi modül örneğiyle çalışır, yani hak kullanılmamış
 * durumda başlar. Testler sırayla ilerler.
 */
describe('seri koruma hakkı — ayda bir', () => {
  it('hiç kullanılmamışken hak vardır', () => {
    expect(seriKorumaHakkiVarMi('2026-08-24')).toBe(true);
  });

  it('kullanıldıktan sonra aynı ay içinde hak kalmaz', () => {
    seriKorumaHakkiKullan('2026-08-24');
    expect(seriKorumaHakkiVarMi('2026-08-24')).toBe(false);
  });

  it('aynı ayın başka bir gününde de hak yoktur', () => {
    expect(seriKorumaHakkiVarMi('2026-08-02')).toBe(false);
    expect(seriKorumaHakkiVarMi('2026-08-31')).toBe(false);
  });

  it('ay dönünce hak tazelenir', () => {
    expect(seriKorumaHakkiVarMi('2026-09-01')).toBe(true);
  });

  it('yıl dönümü de ay değişimi sayılır', () => {
    seriKorumaHakkiKullan('2026-12-15');
    expect(seriKorumaHakkiVarMi('2026-12-31')).toBe(false);
    expect(seriKorumaHakkiVarMi('2027-01-01')).toBe(true);
  });
});
