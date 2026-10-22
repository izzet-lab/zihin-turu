import { describe, it, expect } from 'vitest';
import {
  nihaiPuanHesap,
  jokerPuanCarpani,
  JOKER_HAK_SAYISI,
  SEVIYELER,
  type JokerTip,
  type NihaiPuanGirdi,
} from '@tamisabet/oyun-sayi';
import { JOKER_PUAN_ORANI } from '@tamisabet/cekirdek';

/**
 * JOKER BEDELİ ANLAMLI AMA TEŞVİKİ TERSİNE ÇEVİRMEYEN OLMALI.
 *
 * İki ayrı hata yaşandı, test ikisini birden bekliyor.
 *
 * BİRİNCİSİ (Ağustos 2026) — bedel çok ucuzdu. Bedeller (3/2/2) 0–15'lik
 * TEMEL puan ölçeğine göre konmuştu ama çarpandan SONRA uygulanıyordu;
 * Günün Turu ×10 olunca üç joker 140 puanlık turda yalnızca 7 puan
 * düşürüyordu (%5). Bedel çarpandan önceye alındı.
 *
 * İKİNCİSİ (20 Ekim 2026) — bu kez çok pahalı oldu. Sabit bedel temel
 * puanın neredeyse tamamını siliyordu:
 *
 *   tam isabet + 3 joker : (10 + 1 − 9) × 10 = 20 puan
 *   jokersiz "yakın"     :            7 × 10 = 70 puan
 *
 * Yani jokerle BULMAK, jokersiz IsKALAMAKTAN az puan getiriyordu —
 * teşvik tersine dönmüştü, oyuncunun joker kullanmaması daha kârlıydı.
 *
 * Yeni kural: her joker puanı %20 düşürür, çarpımsal. Bedel puanın
 * büyüklüğüyle ölçeklendiği için her modda aynı oranda hissedilir ve
 * puanı asla sıfıra indirmez.
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

const modlar: { ad: string; over: Partial<NihaiPuanGirdi> }[] = [
  { ad: 'Günün Turu · normal', over: { mod: 'gunun', seviye: 'normal' } },
  {
    ad: 'Günün Turu · usta',
    over: { mod: 'gunun', seviye: 'usta', toplamSaniye: 90, kalanSaniye: 60, secilenSure: 90 },
  },
  { ad: 'Antrenman · normal 60sn', over: { mod: 'antrenman', seviye: 'normal' } },
  {
    ad: 'Antrenman · normal 15sn',
    over: { mod: 'antrenman', seviye: 'normal', toplamSaniye: 15, kalanSaniye: 10, secilenSure: 15 },
  },
  {
    ad: 'Antrenman · usta 30sn',
    over: { mod: 'antrenman', seviye: 'usta', toplamSaniye: 30, kalanSaniye: 20, secilenSure: 30 },
  },
];

describe('joker kullanmak cezalandırılmamalı', () => {
  for (const m of modlar) {
    it(`${m.ad} — jokerle TAM İSABET, jokersiz "yakın"dan çok puan getirir`, () => {
      // Oyuncunun gördüğü karşılaştırma bu. Tersi olursa joker ölü
      // özellik olur: takılan oyuncu turu çöpe atmayı seçer.
      const jokerliTam = nihaiPuanHesap(
        girdi({ ...m.over, fark: 0, kullanilanJokerler: UC_JOKER }),
      ).nihai;
      const jokersizYakin = nihaiPuanHesap(girdi({ ...m.over, fark: 1, kalanSaniye: 0 })).nihai;

      expect(jokersizYakin, 'yakın sonuç puan almalı').toBeGreaterThan(0);
      expect(
        jokerliTam,
        `${m.ad}: jokerli tam isabet ${jokerliTam}, jokersiz yakın ${jokersizYakin}`,
      ).toBeGreaterThan(jokersizYakin);
    });
  }
});

describe('joker bedeli anlamlı olmalı', () => {
  for (const m of modlar) {
    it(`${m.ad} — üç joker puanın ciddi bir kısmını götürür`, () => {
      const jokersiz = nihaiPuanHesap(girdi(m.over)).nihai;
      const p = nihaiPuanHesap(girdi({ ...m.over, kullanilanJokerler: UC_JOKER }));

      expect(jokersiz, 'tam isabet puanı sıfır olamaz').toBeGreaterThan(0);
      expect(p.nihai, 'joker puanı artıramaz').toBeLessThan(jokersiz);

      const oran = (jokersiz - p.nihai) / jokersiz;
      // Üst sınır 1 − 0.8³ = %49. Alt sınır devreye girerse kesinti
      // bundan AZ olur; bu bir hata değil, kuralın kendisi.
      expect(oran, `${m.ad}: düşüş %${(oran * 100).toFixed(0)}`).toBeGreaterThan(0.3);
      expect(oran, `${m.ad}: düşüş %${(oran * 100).toFixed(0)}`).toBeLessThan(0.52);
      if (!p.altSinirUygulandi) {
        expect(oran).toBeGreaterThan(0.4);
      }
    });

    it(`${m.ad} — tek joker bile fark ettirir`, () => {
      const jokersiz = nihaiPuanHesap(girdi(m.over)).nihai;
      const tek = nihaiPuanHesap(girdi({ ...m.over, kullanilanJokerler: ['adim'] })).nihai;
      expect(tek).toBeLessThan(jokersiz);
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
    // Oran artık formülden geliyor; aradaki fark yalnızca yuvarlama.
    expect(enCok - enAz, `oran aralığı %${((enCok - enAz) * 100).toFixed(0)}`).toBeLessThan(0.08);
  });
});

describe('bedel çarpımsal', () => {
  it('katsayı her joker için %20 düşürüyor', () => {
    expect(jokerPuanCarpani(0)).toBe(1);
    expect(jokerPuanCarpani(1)).toBeCloseTo(0.8, 10);
    expect(jokerPuanCarpani(2)).toBeCloseTo(0.64, 10);
    expect(jokerPuanCarpani(3)).toBeCloseTo(0.512, 10);
  });

  it('bedel türe göre DEĞİŞMEZ — üç joker hangisi olursa olsun aynı', () => {
    // Türe göre fiyat, oyuncunun ezberlemesi gereken gizli bir kuraldı.
    const a = nihaiPuanHesap(girdi({ kullanilanJokerler: ['adim', 'adim', 'adim'] })).nihai;
    const b = nihaiPuanHesap(girdi({ kullanilanJokerler: ['sure', 'yanlis', 'adim'] })).nihai;
    expect(a).toBe(b);
  });

  it('dökümdeki katsayı gerçekten uygulanmış', () => {
    const p = nihaiPuanHesap(girdi({ kullanilanJokerler: UC_JOKER }));
    expect(p.jokerSayisi).toBe(3);
    expect(p.jokerCarpani).toBeCloseTo(Math.pow(JOKER_PUAN_ORANI, 3), 10);
    // Alt sınır devreye girmediyse puan tam olarak katsayı kadardır.
    if (!p.altSinirUygulandi) {
      expect(p.nihai).toBe(Math.round(p.jokersizNihai * p.jokerCarpani));
    } else {
      expect(p.nihai).toBeGreaterThan(Math.round(p.jokersizNihai * p.jokerCarpani));
    }
  });

  it('alt sınır: joker seni bir alt kademeye düşürmez', () => {
    // Hız bonusu olmayan bir tam isabet, üç jokerle bile jokersiz
    // bir "yakın"ın altına inmemeli. Asıl şikâyet buydu.
    const yavasTam = nihaiPuanHesap(
      girdi({ fark: 0, kalanSaniye: 0, kullanilanJokerler: UC_JOKER }),
    );
    const jokersizYakin = nihaiPuanHesap(girdi({ fark: 1, kalanSaniye: 0 })).nihai;
    expect(yavasTam.altSinirUygulandi).toBe(true);
    expect(yavasTam.nihai).toBeGreaterThan(jokersizYakin);
  });

  it('joker yoksa katsayı 1 ve puan değişmez', () => {
    const p = nihaiPuanHesap(girdi());
    expect(p.jokerCarpani).toBe(1);
    expect(p.nihai).toBe(p.jokersizNihai);
  });

  it('puan hiçbir zaman eksiye düşmez', () => {
    const p = nihaiPuanHesap(girdi({ fark: 9999, kalanSaniye: 0, kullanilanJokerler: UC_JOKER }));
    expect(p.nihai).toBeGreaterThanOrEqual(0);
  });

  it('hak sayısı kadar joker bile puanı sıfırlamaz', () => {
    // Çarpımsal bedelin asıl kazancı: oyuncu her zaman bir şey alır.
    const hepsi: JokerTip[] = Array(JOKER_HAK_SAYISI).fill('adim');
    const p = nihaiPuanHesap(girdi({ kullanilanJokerler: hepsi }));
    expect(p.nihai).toBeGreaterThan(0);
  });

  it('her seviyede tam isabet puanı pozitif', () => {
    for (const seviye of Object.keys(SEVIYELER)) {
      const p = nihaiPuanHesap(girdi({ seviye, mod: 'gunun' }));
      expect(p.nihai, seviye).toBeGreaterThan(0);
    }
  });
});
