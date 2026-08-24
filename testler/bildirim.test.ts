import { describe, it, expect } from 'vitest';
import {
  planlamaKarariVer,
  mesajSec,
  gunAnahtari,
  KORUMA_NOTU,
  type PlanlamaGirdisi,
} from '../uygulama/src/bildirim-karar';

/**
 * Günlük hatırlatmanın karar mantığı.
 *
 * Native bildirim katmanı (Capacitor) tarayıcıda çalışmıyor ve izin
 * diyaloğu Playwright'ta yok. Bu yüzden karar — "bugün mü yarın mı,
 * hangi metinle, yoksa hiç mi" — saf bir fonksiyona ayrıldı ve
 * testleri burada. Native katman yalnızca bu kararı uyguluyor.
 */

const AYAR = { acik: true, saat: 20, dakika: 0 };

/** Öğlen 12:00 — seçilen 20:00 saatinden önce. */
const OGLEN = new Date(2026, 7, 24, 12, 0, 0);
/** Gece 22:00 — seçilen 20:00 saati geçmiş. */
const GECE = new Date(2026, 7, 24, 22, 0, 0);

function girdi(uzerine: Partial<PlanlamaGirdisi> = {}): PlanlamaGirdisi {
  return {
    ayar: AYAR,
    izinVar: true,
    simdi: OGLEN,
    bugunOynandi: false,
    seriGun: 0,
    korumaHakkiVar: false,
    ...uzerine,
  };
}

describe('bildirim: izin ve açık/kapalı durumu', () => {
  it('izin verilmemişken hiçbir şey planlanmaz ve çökme olmaz', () => {
    const karar = planlamaKarariVer(girdi({ izinVar: false }));
    expect(karar).toEqual({ tur: 'iptal', gerekce: 'izin-yok' });
  });

  it('ayar kapalıyken izin olsa bile planlanmaz', () => {
    const karar = planlamaKarariVer(
      girdi({ ayar: { ...AYAR, acik: false }, izinVar: true }),
    );
    expect(karar).toEqual({ tur: 'iptal', gerekce: 'kapali' });
  });

  it('izin de ayar da kapalıyken kapalı olması öncelikli sebeptir', () => {
    const karar = planlamaKarariVer(
      girdi({ ayar: { ...AYAR, acik: false }, izinVar: false }),
    );
    expect(karar).toEqual({ tur: 'iptal', gerekce: 'kapali' });
  });
});

describe('bildirim: ne zaman planlanır', () => {
  it('izin varken ve bugün oynanmamışken bugünün seçilen saatine planlanır', () => {
    const karar = planlamaKarariVer(girdi());
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    expect(gunAnahtari(karar.ne)).toBe('2026-08-24');
    expect(karar.ne.getHours()).toBe(20);
    expect(karar.ne.getMinutes()).toBe(0);
  });

  it('bugün oynandıysa bugünkü bildirim düşer, yarına planlanır', () => {
    const karar = planlamaKarariVer(girdi({ bugunOynandi: true }));
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    expect(gunAnahtari(karar.ne)).toBe('2026-08-25');
  });

  it('seçilen saat geçmişse yarına planlanır', () => {
    const karar = planlamaKarariVer(girdi({ simdi: GECE }));
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    expect(gunAnahtari(karar.ne)).toBe('2026-08-25');
  });

  it('kullanıcının seçtiği saat onurlandırılır', () => {
    const karar = planlamaKarariVer(
      girdi({ ayar: { acik: true, saat: 9, dakika: 30 } }),
    );
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    // 09:30 öğlenden önce geçmiş → yarına
    expect(karar.ne.getHours()).toBe(9);
    expect(karar.ne.getMinutes()).toBe(30);
  });

  it('ay sonunda yarın doğru aya taşar', () => {
    const karar = planlamaKarariVer(
      girdi({ simdi: new Date(2026, 7, 31, 22, 0, 0) }),
    );
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    expect(gunAnahtari(karar.ne)).toBe('2026-09-01');
  });
});

describe('bildirim: metin', () => {
  it('metin sabit değil, güne göre döner', () => {
    const gunler = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27'];
    const basliklar = new Set(gunler.map((g) => mesajSec(g, 0, false).baslik));
    expect(basliklar.size).toBeGreaterThan(1);
  });

  it('aynı gün her zaman aynı metni verir (deterministik)', () => {
    expect(mesajSec('2026-08-24', 0, false)).toEqual(mesajSec('2026-08-24', 0, false));
  });

  it('seri varsa seriyi hatırlatır ve gün sayısını söyler', () => {
    const mesaj = mesajSec('2026-08-24', 3, false);
    expect(`${mesaj.baslik} ${mesaj.govde}`).toContain('3');
    expect(`${mesaj.baslik} ${mesaj.govde}`.toLowerCase()).toContain('seri');
  });

  it('tek günlük seri henüz hatırlatılmaz — genel metin çıkar', () => {
    const mesaj = mesajSec('2026-08-24', 1, false);
    expect(`${mesaj.baslik} ${mesaj.govde}`.toLowerCase()).not.toContain('seri');
  });

  it('seri koruma hakkı duruyorsa metinde söylenir', () => {
    expect(mesajSec('2026-08-24', 3, true).govde).toContain(KORUMA_NOTU.trim());
  });

  it('koruma hakkı yoksa o not eklenmez', () => {
    expect(mesajSec('2026-08-24', 3, false).govde).not.toContain(KORUMA_NOTU.trim());
  });

  it('serisi olmayana koruma notu ilişmez', () => {
    expect(mesajSec('2026-08-24', 0, true).govde).not.toContain(KORUMA_NOTU.trim());
  });

  it('planlanan metin, bildirimin çıkacağı GÜNE göre seçilir', () => {
    // Bugün oynandı → yarına planlanıyor → yarının metni kullanılmalı
    const karar = planlamaKarariVer(girdi({ bugunOynandi: true, seriGun: 5 }));
    expect(karar.tur).toBe('planla');
    if (karar.tur !== 'planla') return;
    expect(karar.baslik).toBe(mesajSec('2026-08-25', 5, false).baslik);
  });
});
