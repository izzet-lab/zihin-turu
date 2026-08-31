import { describe, it, expect, beforeEach } from 'vitest';
import { tercihleriOku } from '../uygulama/src/gizlilik-tercih';
import { npaKarari } from '../uygulama/src/reklam-karar';
import { dogumYiliYaz, resinDegilMi } from '../uygulama/src/depo';

/**
 * GİZLİLİK VE REKLAM KURALLARI (CLAUDE.md kural 6 ve 7).
 *
 * Bunlar "çalışıyor mu" testi değil, "beyanımıza uyuyor mu" testi.
 * Yasal metinler ve Play Store Data safety formu bu davranışları
 * anlatıyor; kod onlarla çelişirse beyan yanlış olur.
 */

describe('kural 7 — Analytics varsayılan KAPALI', () => {
  it('hiçbir tercih kaydedilmemişken analitik kapalı gelir', () => {
    // Önceden açık geliyordu: kullanıcı hiçbir şey seçmeden davranışı
    // ölçülüyordu. Gizlilik duruşumuz bunun tersi.
    const t = tercihleriOku();
    expect(t.analytics, 'Analytics varsayılan açık olamaz').toBe(false);
  });

  it('Crashlytics varsayılan açık — çökme teşhisi davranış ölçümü değil', () => {
    expect(tercihleriOku().crashlytics).toBe(true);
  });
});

describe('kural 6 — 18 altına kişiselleştirilmiş reklam gösterilmez', () => {
  const buYil = new Date().getFullYear();

  beforeEach(() => {
    // Her testte temiz yaş bilgisi
    dogumYiliYaz(buYil - 30);
  });

  it('18 yaş altında npa zorunlu', () => {
    for (const yas of [13, 14, 15, 16, 17]) {
      dogumYiliYaz(buYil - yas);
      expect(resinDegilMi(), `yaş ${yas}`).toBe(true);
      expect(npaKarari(resinDegilMi(), false), `yaş ${yas} için npa`).toBe(true);
    }
  });

  it('18 ve üstünde, onay yoksa yine npa', () => {
    // Onay alınmadığı sürece kişiselleştirilmiş reklam gösterilmez.
    for (const yas of [18, 25, 60]) {
      dogumYiliYaz(buYil - yas);
      expect(resinDegilMi(), `yaş ${yas}`).toBe(false);
      expect(npaKarari(resinDegilMi(), false), `yaş ${yas}, onay yok`).toBe(true);
    }
  });

  it('yaş bilinmiyorsa reklam yine kişiselleştirilmez', () => {
    // Doğum yılı yoksa yetişkin varsayılır ama onay da yoktur;
    // sonuç yine npa. Belirsizlikte güvenli taraf.
    expect(npaKarari(resinDegilMi(), false)).toBe(true);
  });
});
