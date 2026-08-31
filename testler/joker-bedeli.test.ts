import { describe, it, expect } from 'vitest';
import {
  nihaiPuanHesap,
  JOKER_MALIYET,
  JOKER_HAK_SAYISI,
  GUNUN_TURU_CARPANI,
  SEVIYELER,
  type JokerTip,
  type NihaiPuanGirdi,
} from '@zihinturu/oyun-sayi';

/**
 * JOKER BEDELİ GERÇEKTEN DÜŞMELİ.
 *
 * Ağustos 2026: oyuncu üç jokerin üçünü de kullanıp tam isabet yaptı ve
 * puanı neredeyse hiç düşmedi.
 *
 * Sebep: joker bedelleri (3/2/2) 0–15'lik TEMEL puan ölçeğine göre
 * belirlenmişti ama bedel ÇARPANDAN SONRA uygulanıyordu. Faz 3C'de
 * Günün Turu puanı ×10 büyütülünce bedeller büyütülmedi: 140 puanlık
 * turda üç joker yalnızca 7 puan düşürüyordu (%5). Aynı üç joker
 * Antrenman'da %33 düşürüyordu — aynı hak, moda göre bambaşka fiyat.
 *
 * Bedel artık çarpandan ÖNCE düşülüyor; oran her modda aynı kalıyor.
 */

const UC_JOKER: JokerTip[] = ['adim', 'yanlis', 'sure'];

function girdi(over: Partial<NihaiPuanGirdi> = {}): NihaiPuanGirdi {
  return {
    seviye: 'normal',
    fark: 0,
    kalanSaniye: 45,
    toplamSaniye: 60,
    mod: 'gunun',
    secilenSure: 60,
    kullanilanJokerler: [],
    ...over,
  };
}

describe('joker bedeli anlamlı olmalı', () => {
  const modlar: { ad: string; over: Partial<NihaiPuanGirdi> }[] = [
    { ad: 'Günün Turu · normal', over: { mod: 'gunun', seviye: 'normal' } },
    { ad: 'Günün Turu · usta', over: { mod: 'gunun', seviye: 'usta', toplamSaniye: 90, kalanSaniye: 60, secilenSure: 90 } },
    { ad: 'Antrenman · normal 60sn', over: { mod: 'antrenman', seviye: 'normal' } },
    { ad: 'Antrenman · normal 15sn', over: { mod: 'antrenman', seviye: 'normal', toplamSaniye: 15, kalanSaniye: 10, secilenSure: 15 } },
    { ad: 'Antrenman · usta 30sn', over: { mod: 'antrenman', seviye: 'usta', toplamSaniye: 30, kalanSaniye: 20, secilenSure: 30 } },
  ];

  for (const m of modlar) {
    it(`${m.ad} — üç joker puanın en az üçte birini götürür`, () => {
      const jokersiz = nihaiPuanHesap(girdi(m.over)).nihai;
      const jokerli = nihaiPuanHesap(girdi({ ...m.over, kullanilanJokerler: UC_JOKER })).nihai;

      expect(jokersiz, 'tam isabet puanı sıfır olamaz').toBeGreaterThan(0);
      expect(jokerli, 'joker puanı artıramaz').toBeLessThan(jokersiz);

      const oran = (jokersiz - jokerli) / jokersiz;
      // Eski hatada bu oran Günün Turu'nda %5'ti.
      expect(oran, `${m.ad}: düşüş oranı %${(oran * 100).toFixed(0)}`).toBeGreaterThan(0.33);
    });

    it(`${m.ad} — tek joker bile fark ettirir`, () => {
      const jokersiz = nihaiPuanHesap(girdi(m.over)).nihai;
      const tek = nihaiPuanHesap(girdi({ ...m.over, kullanilanJokerler: ['adim'] })).nihai;
      expect(tek).toBeLessThan(jokersiz);
      // Görünür olmalı: en az %10.
      expect((jokersiz - tek) / jokersiz).toBeGreaterThan(0.1);
    });
  }

  it('bedel oranı modlar arasında tutarlı — aynı hak, aynı fiyat', () => {
    const oranlar = modlar.map((m) => {
      const yok = nihaiPuanHesap(girdi(m.over)).nihai;
      const uc = nihaiPuanHesap(girdi({ ...m.over, kullanilanJokerler: UC_JOKER })).nihai;
      return (yok - uc) / yok;
    });
    const enAz = Math.min(...oranlar);
    const enCok = Math.max(...oranlar);
    // Eski hatada aralık %5 ile %33 arasıydı; artık dar olmalı.
    expect(enCok - enAz, `oran aralığı %${((enCok - enAz) * 100).toFixed(0)}`).toBeLessThan(0.15);
  });
});

describe('joker bedeli çarpandan ÖNCE düşülür', () => {
  it('Günün Turu: bedel ×10 olarak yansır', () => {
    const p = nihaiPuanHesap(girdi({ kullanilanJokerler: ['adim'] }));
    const yok = nihaiPuanHesap(girdi());
    // 'adim' bedeli 3 → çarpandan önce düşülürse 30 puan eder.
    expect(yok.nihai - p.nihai).toBe(JOKER_MALIYET.adim * GUNUN_TURU_CARPANI);
  });

  it('temelJokerli, temel puandan bedel kadar düşük', () => {
    const p = nihaiPuanHesap(girdi({ kullanilanJokerler: UC_JOKER }));
    const toplamBedel = UC_JOKER.reduce((t, j) => t + JOKER_MALIYET[j], 0);
    expect(p.temelJokerli).toBe(Math.max(0, p.temel.toplam - toplamBedel));
  });

  it('puan hiçbir zaman eksiye düşmez', () => {
    // Uzak sonuç + tüm jokerler: taban puan bedelin altında kalabilir.
    const p = nihaiPuanHesap(girdi({ fark: 9999, kalanSaniye: 0, kullanilanJokerler: UC_JOKER }));
    expect(p.nihai).toBeGreaterThanOrEqual(0);
  });
});

describe('bedeller ölçeğe uygun kalmalı', () => {
  it('üç jokerin toplam bedeli temel tam isabetin yarısına yakın', () => {
    // Bu, bedellerin tasarım niyeti. Puan ölçeği ileride değişirse
    // (Faz 3C'deki ×10 gibi) bu test bedellerin de gözden geçirilmesi
    // gerektiğini hatırlatır.
    const tamIsabet = nihaiPuanHesap(girdi()).temel.toplam;
    const toplamBedel = UC_JOKER.reduce((t, j) => t + JOKER_MALIYET[j], 0);
    const oran = toplamBedel / tamIsabet;
    expect(oran).toBeGreaterThan(0.35);
    expect(oran).toBeLessThan(0.65);
  });

  it('joker hakkı sayısı bedel listesiyle tutarlı', () => {
    expect(JOKER_HAK_SAYISI).toBe(Object.keys(JOKER_MALIYET).length);
  });

  it('her seviyede tam isabet puanı pozitif', () => {
    for (const seviye of Object.keys(SEVIYELER)) {
      const p = nihaiPuanHesap(girdi({ seviye, mod: 'gunun' }));
      expect(p.nihai, seviye).toBeGreaterThan(0);
    }
  });
});
