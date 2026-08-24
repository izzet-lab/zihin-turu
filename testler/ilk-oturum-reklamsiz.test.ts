import { describe, it, expect } from 'vitest';
import {
  REKLAMSIZ_TUR_SAYISI,
  tamamlananTurSayisi,
  tamamlananTurArtir,
  bannerGosterilebilirMi,
} from '../uygulama/src/depo';

/**
 * İlk oturum reklamsızlığı.
 *
 * Kural: kullanıcı REKLAMSIZ_TUR_SAYISI kadar tur tamamlayana kadar
 * hiç banner gösterilmez. Sayaç kalıcı saklanır; uygulama kapanıp
 * açılınca sıfırlanmaz. Ödüllü video bu kuraldan muaftır.
 *
 * Bu dosya kendi modül örneğiyle çalışır, yani sayaç 0'dan başlar.
 * Testler sırayla ilerler — her biri bir öncekinin bıraktığı sayıdan
 * devam eder; "kalıcılık" davranışının kendisi budur.
 */
describe('ilk oturum reklamsız', () => {
  it('eşik 3 turdur', () => {
    expect(REKLAMSIZ_TUR_SAYISI).toBe(3);
  });

  it('hiç oynamamışken sayaç sıfırdır ve banner gösterilmez', () => {
    expect(tamamlananTurSayisi()).toBe(0);
    expect(bannerGosterilebilirMi()).toBe(false);
  });

  it('eşiğe kadar olan turlarda banner hâlâ gösterilmez', () => {
    for (let i = 1; i < REKLAMSIZ_TUR_SAYISI; i++) {
      expect(tamamlananTurArtir()).toBe(i);
      expect(bannerGosterilebilirMi()).toBe(false);
    }
  });

  it('eşiğe ulaşan turdan sonra banner gösterilir', () => {
    expect(tamamlananTurArtir()).toBe(REKLAMSIZ_TUR_SAYISI);
    expect(bannerGosterilebilirMi()).toBe(true);
  });

  it('sayaç eşiği aştıktan sonra artmaya devam etmez ama kapı açık kalır', () => {
    tamamlananTurArtir();
    tamamlananTurArtir();
    expect(tamamlananTurSayisi()).toBe(REKLAMSIZ_TUR_SAYISI);
    expect(bannerGosterilebilirMi()).toBe(true);
  });
});
