import { describe, it, expect } from 'vitest';
import { kutlamalariBul, SERI_ESIKLERI, type IlerlemeOzeti } from '../uygulama/src/kutlama-karar';

/*
  ÖDÜL TÖRENİ KARARI

  "Neyin kutlanacağı" bir arayüz sorusu değil, kural sorusu. Bu testler
  üç şeyi koruyor: kazanılan görünür, kazanılmayan görünmez, aynı şey
  iki kez kutlanmaz.
*/

const bos: IlerlemeOzeti = { xp: 0, seriGun: 0, rozetler: [] };

describe('kutlama kararı', () => {
  it('ilk fotoğrafta hiçbir şey kutlanmaz', () => {
    // Hesabına ilk kez giren oyuncuya geçmişte kazandığı her şeyi arka
    // arkaya kutlatmak saçma olurdu.
    const simdi: IlerlemeOzeti = { xp: 9000, seriGun: 40, rozetler: ['seri_3', 'tam_10'] };
    expect(kutlamalariBul(null, simdi)).toEqual([]);
  });

  it('hiçbir şey değişmediyse kutlama yok', () => {
    expect(kutlamalariBul(bos, bos)).toEqual([]);
  });

  it('seviye atlayınca kutlanır', () => {
    // Lv.2 eşiği 500 XP.
    const k = kutlamalariBul({ ...bos, xp: 480 }, { ...bos, xp: 520 });
    expect(k).toHaveLength(1);
    expect(k[0]).toMatchObject({ tur: 'seviye', seviye: 2 });
  });

  it('aynı seviyede kalan XP artışı kutlanmaz', () => {
    expect(kutlamalariBul({ ...bos, xp: 100 }, { ...bos, xp: 300 })).toEqual([]);
  });

  it('yeni rozet kutlanır, eski rozet tekrar kutlanmaz', () => {
    const onceki: IlerlemeOzeti = { ...bos, rozetler: ['seri_3'] };
    const simdi: IlerlemeOzeti = { ...bos, rozetler: ['seri_3', 'tam_ilk'] };
    const k = kutlamalariBul(onceki, simdi);
    expect(k).toHaveLength(1);
    expect(k[0]).toMatchObject({ tur: 'rozet' });
    expect(k[0]!.tur === 'rozet' && k[0].rozet.kod).toBe('tam_ilk');
  });

  it('katalogda olmayan rozet kodu sessizce atlanır', () => {
    // Veritabanına yeni bir rozet eklenip arayüz güncellenmezse
    // uygulama kırılmamalı.
    const k = kutlamalariBul(bos, { ...bos, rozetler: ['boyle_bir_rozet_yok'] });
    expect(k).toEqual([]);
  });

  it('seri eşiği geçilince kutlanır, aynı eşik ikinci kez kutlanmaz', () => {
    const esik = SERI_ESIKLERI[0]!;
    const gecis = kutlamalariBul({ ...bos, seriGun: esik - 1 }, { ...bos, seriGun: esik });
    expect(gecis).toEqual([{ tur: 'seri', gun: esik }]);

    const sonra = kutlamalariBul({ ...bos, seriGun: esik }, { ...bos, seriGun: esik + 1 });
    expect(sonra).toEqual([]);
  });

  it('rozeti olan seri basamakları ayrıca kutlanmaz', () => {
    // 3, 7, 30 ve 100 zaten rozet veriyor; seri kutlaması o günleri
    // ikinci kez göstermemeli.
    for (const rozetliGun of [3, 7, 30, 100]) {
      expect(SERI_ESIKLERI).not.toContain(rozetliGun);
    }
  });

  it('aynı anda birden fazla kutlama sıraya girer — önce seviye', () => {
    const onceki: IlerlemeOzeti = { xp: 480, seriGun: 13, rozetler: [] };
    const simdi: IlerlemeOzeti = { xp: 600, seriGun: 14, rozetler: ['tam_ilk'] };
    const k = kutlamalariBul(onceki, simdi);
    expect(k.map((x) => x.tur)).toEqual(['seviye', 'rozet', 'seri']);
  });
});
