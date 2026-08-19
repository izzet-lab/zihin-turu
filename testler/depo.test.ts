import { describe, it, expect, beforeEach } from 'vitest';
import {
  yaz,
  gunlukKilitli,
  gunlukKaydet,
  serit,
  acikSeviyeler,
  seviyeAcikMi,
  seviyeAc,
  eskiGunlukDonustur,
  hicOynamamisMi,
  eskiSeviyeleriEsle,
  type Ilerleme,
} from '../uygulama/src/depo';

/**
 * Bu testler Node ortamında çalışır; `window` tanımsız olduğu için
 * depo.ts kendiliğinden belleğe düşer (kaliciMi() false olur). Bu,
 * "localStorage erişilemezse çökmesin" davranışının kendisidir — test
 * de bu bellek moduna güvenerek çalışır. Depo modül-seviyesinde
 * paylaşıldığı için her testten önce taze bir duruma sıfırlanır.
 */
function taze(): void {
  const bos: Ilerleme = {
    surum: 2,
    seri: { son: null, gun: 0, enUzun: 0 },
    tam: 0,
    gunluk: {},
    acikSeviyeler: ['cocuk'],
  };
  yaz(bos);
}

beforeEach(() => {
  taze();
});

describe('günlük kilit — genel, seviyeden bağımsız', () => {
  it('hiç oynanmamışsa kilitli değil', () => {
    expect(gunlukKilitli('2026-08-16')).toBe(false);
  });

  it('bir seviyede oynanınca gün tamamen kilitlenir', () => {
    gunlukKaydet('2026-08-16', 'normal', { fark: 0, puan: 10 });
    expect(gunlukKilitli('2026-08-16')).toBe(true);
  });

  it('aynı gün ikinci kayıt hiçbir şeyi değiştirmez (idempotent)', () => {
    const il1 = gunlukKaydet('2026-08-16', 'normal', { fark: 0, puan: 10 });
    const il2 = gunlukKaydet('2026-08-16', 'normal', { fark: 5, puan: 3 });
    expect(il2.tam).toBe(il1.tam);
    expect(il2.gunluk['2026-08-16']!.seviye).toBe('normal'); // ilk kayıt korunur
  });

  it('tam isabet sayacı günde yalnızca bir kez artar', () => {
    const il = gunlukKaydet('2026-08-16', 'normal', { fark: 0, puan: 10 });
    expect(il.tam).toBe(1);
    const il2 = gunlukKaydet('2026-08-16', 'zor', { fark: 0, puan: 20 });
    expect(il2.tam).toBe(1);
  });
});

describe('kesintisiz seri', () => {
  it('art arda günlerde seri büyür', () => {
    gunlukKaydet('2026-08-14', 'normal', { fark: 0, puan: 10 });
    gunlukKaydet('2026-08-15', 'normal', { fark: 0, puan: 10 });
    const il = gunlukKaydet('2026-08-16', 'normal', { fark: 0, puan: 10 });
    expect(il.seri.gun).toBe(3);
    expect(il.seri.enUzun).toBe(3);
  });

  it('araya gün girerse seri sıfırdan başlar', () => {
    gunlukKaydet('2026-08-10', 'normal', { fark: 0, puan: 10 });
    const il = gunlukKaydet('2026-08-16', 'normal', { fark: 0, puan: 10 });
    expect(il.seri.gun).toBe(1);
  });
});

describe('28 günlük şerit — genel', () => {
  it('oynanan gün seviyeden bağımsız görünür', () => {
    gunlukKaydet('2026-08-16', 'usta', { fark: 0, puan: 12 });
    const s = serit('2026-08-16', 5);
    const bugunKaydi = s.find((g) => g.tarih === '2026-08-16');
    expect(bugunKaydi?.durum).toBe('tam');
  });

  it('oynanmayan gün null durumda', () => {
    const s = serit('2026-08-16', 3);
    expect(s.every((g) => g.durum === null)).toBe(true);
  });
});

describe('seviye kilidi', () => {
  it('ilk durumda yalnızca Isınma (cocuk) açık', () => {
    expect(acikSeviyeler()).toEqual(['cocuk']);
    expect(seviyeAcikMi('cocuk')).toBe(true);
    expect(seviyeAcikMi('normal')).toBe(false);
  });

  it('seviyeAc bir sonraki seviyeyi açar', () => {
    const il = seviyeAc('normal');
    expect(il.acikSeviyeler).toEqual(['cocuk', 'normal']);
  });

  it('zaten açık bir seviye tekrar eklenmez', () => {
    seviyeAc('normal');
    const il = seviyeAc('normal');
    expect(il.acikSeviyeler).toEqual(['cocuk', 'normal']);
  });
});

describe('sürüm 1 → 2 göçü: günlük kayıt dönüştürme', () => {
  it('bir günde tek seviye kaydı doğru taşınır', () => {
    const eski = { '2026-08-16:normal': { fark: 5, puan: 7 } };
    const yeni = eskiGunlukDonustur(eski);
    expect(yeni['2026-08-16']).toEqual({ fark: 5, puan: 7, seviye: 'normal', tarih: '2026-08-16' });
  });

  it('bir günde birden fazla seviye kaydı varsa en iyi (fark) tutulur', () => {
    const eski = {
      '2026-08-16:kolay': { fark: 8, puan: 5 },
      '2026-08-16:normal': { fark: 0, puan: 10 },
    };
    const yeni = eskiGunlukDonustur(eski);
    expect(yeni['2026-08-16']!.fark).toBe(0);
    expect(yeni['2026-08-16']!.seviye).toBe('normal');
  });
});

describe('hiçOynamamisMi', () => {
  it('boş ilerleme "hiç oynamamış" sayılır', () => {
    expect(hicOynamamisMi({ gunluk: {}, tam: 0, seri: { son: null, gun: 0, enUzun: 0 } })).toBe(true);
  });

  it('herhangi bir geçmişi olan "oynamış" sayılır', () => {
    expect(hicOynamamisMi({ tam: 3 })).toBe(false);
    expect(hicOynamamisMi({ gunluk: { '2026-08-16': { fark: 0, puan: 10, seviye: 'normal', tarih: '2026-08-16' } } })).toBe(
      false,
    );
    expect(hicOynamamisMi({ seri: { son: '2026-08-16', gun: 1, enUzun: 1 } })).toBe(false);
  });
});

describe('kolay -> normal seviye göçü', () => {
  it('kolay açmış oyuncu normal ile devam eder', () => {
    expect(eskiSeviyeleriEsle(['cocuk', 'kolay'])).toEqual(['cocuk', 'normal']);
  });

  it('hem kolay hem normal açıksa tekrar oluşmaz', () => {
    expect(eskiSeviyeleriEsle(['cocuk', 'kolay', 'normal'])).toEqual(['cocuk', 'normal']);
  });

  it('artık var olmayan anahtarlar atılır', () => {
    expect(eskiSeviyeleriEsle(['cocuk', 'uydurma'])).toEqual(['cocuk']);
  });

  it('güncel liste olduğu gibi kalır', () => {
    expect(eskiSeviyeleriEsle(['cocuk', 'normal', 'zor', 'usta'])).toEqual([
      'cocuk', 'normal', 'zor', 'usta',
    ]);
  });
});
