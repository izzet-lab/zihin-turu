/**
 * kelime-cozum-listesi.test.ts — Tur bitince çıkan kelime listesi.
 *
 * Proje sahibi istedi (14 Ekim 2026): sayı turunda tur bitince çözüm
 * zinciri yazılıyor; kelime turunda yalnızca en uzun kelime yazıyordu.
 * Artık bu harflerden çıkan kelimeler uzundan kısaya doğru listeleniyor.
 *
 * Burada korunan üç şey var:
 *   1. Liste uzundan kısaya sıralı ve ilk satır EN UZUN kelime —
 *      sonuç ekranı ilk satırı "en uzun" diye kullanıyor.
 *   2. Liste sınırlı; havuzdan yüzlerce kelime çıkabiliyor.
 *   3. Süre sınırı verilince o ana kadar bulunanlar dönüyor, boş
 *      liste değil. Düello özeti beş turu arka arkaya hesaplıyor ve
 *      ekranın beklememesi gerekiyor.
 */

import { describe, it, expect } from 'vitest';
import {
  bulunabilirKelimeler,
  enUzunKelime,
  tamSozlukKur,
  havuzUret,
} from '@tamisabet/oyun-kelime';
import { KELIME_METNI, GOVDE_METNI, YAYGIN_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

const genis = tamSozlukKur(KELIME_METNI, GOVDE_METNI);
const yaygin = tamSozlukKur(YAYGIN_METNI);

describe('bu harflerden çıkan kelimeler', () => {
  it('uzundan kısaya sıralı ve ilki en uzun kelime', () => {
    for (const tohum of [1, 7, 42, 1234, 99999]) {
      const veri = havuzUret('normal', tohum, yaygin);
      const liste = bulunabilirKelimeler(veri.harfler, yaygin);
      expect(liste.length, `tohum ${tohum}: liste boş`).toBeGreaterThan(0);

      for (let i = 1; i < liste.length; i++) {
        expect(
          liste[i]!.length,
          `tohum ${tohum}: ${liste[i - 1]} sonrası ${liste[i]} daha uzun`,
        ).toBeLessThanOrEqual(liste[i - 1]!.length);
      }

      const enUzun = enUzunKelime(veri.harfler, yaygin);
      expect(liste[0]!.length, `tohum ${tohum}`).toBe(enUzun!.length);
    }
  });

  it('istenen sayıdan fazlasını döndürmüyor', () => {
    const veri = havuzUret('usta', 2026, yaygin);
    expect(bulunabilirKelimeler(veri.harfler, yaygin, 8).length).toBeLessThanOrEqual(8);
    expect(bulunabilirKelimeler(veri.harfler, yaygin, 3).length).toBeLessThanOrEqual(3);
  });

  it('her kelime gerçekten havuzdan yazılabiliyor', () => {
    const veri = havuzUret('zor', 555, yaygin);
    const havuzSayim = new Map<string, number>();
    for (const h of veri.harfler) havuzSayim.set(h, (havuzSayim.get(h) ?? 0) + 1);

    for (const kelime of bulunabilirKelimeler(veri.harfler, yaygin)) {
      const kalan = new Map(havuzSayim);
      for (const harf of kelime) {
        const adet = kalan.get(harf) ?? 0;
        expect(adet, `${kelime} havuzda olmayan "${harf}" harfini kullanıyor`).toBeGreaterThan(0);
        kalan.set(harf, adet - 1);
      }
    }
  });

  it('düellonun ayırdığı sürede yetişiyor', () => {
    // Düello ve arena özeti tur başına 400 ms veriyor. Liste bu sürede
    // dolmazsa oyuncuya yarım liste gider — kırmızı değil ama bilinsin.
    const veri = havuzUret('normal', 31337, yaygin);
    const basla = Date.now();
    const liste = bulunabilirKelimeler(veri.harfler, yaygin, 8, 400);
    const sure = Date.now() - basla;
    expect(sure, `arama ${sure} ms sürdü`).toBeLessThanOrEqual(400);
    expect(liste.length, 'süre sınırıyla hiç kelime bulunamadı').toBeGreaterThan(0);
  });

  it('geniş sözlükte de çalışıyor — liste yaygından geliyor ama kısıt yok', () => {
    const veri = havuzUret('normal', 8, yaygin);
    expect(bulunabilirKelimeler(veri.harfler, genis).length).toBeGreaterThan(0);
  });
});
