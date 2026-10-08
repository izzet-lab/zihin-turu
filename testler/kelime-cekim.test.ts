import { describe, it, expect } from 'vitest';
import { KELIME_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';
import { sozluktePayVar, tamSozlukKur } from '@tamisabet/oyun-kelime';

/*
  ÇEKİMLİ BİÇİMLER

  Sözlük kök listesi: "kitap" var, "kitabı" yok. Oyuncunun bildiği bir
  kelimenin reddedilmesi kelime oyununda en can sıkıcı an. Çekim bir
  kural olduğu için listeyi şişirmek yerine kural uygulanıyor.

  Yöntem KASITLI OLARAK CÖMERT: bazen olmayan bir çekimi de kabul
  edebilir. Fazladan kabul etmenin bedeli, haklı bir cevabı
  reddetmenin bedelinden küçük.
*/

const sozluk = tamSozlukKur(KELIME_METNI);

describe('çekimli biçimler tanınıyor', () => {
  it('kökün kendisi', () => {
    for (const k of ['kitap', 'ev', 'deniz', 'göz']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('hâl ekleri', () => {
    for (const k of ['evde', 'evden', 'eve', 'evin', 'evi']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('ünsüz yumuşaması geri alınıyor', () => {
    // kitap → kitabı, ağaç → ağacı, renk → rengi
    for (const k of ['kitabı', 'kitaba', 'kitabın', 'ağacı', 'rengi']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('ünlüyle biten köklerde tampon harfler', () => {
    for (const k of ['masayı', 'masaya', 'masanın', 'masası']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('çoğul üstüne hâl eki', () => {
    for (const k of ['kitaplarda', 'kitapları', 'evlerden', 'denizlerin']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('iyelik üstüne hâl eki', () => {
    // kitabında = kitab + ı + n + da — üç katman
    for (const k of ['kitabında', 'evinde', 'gözüne']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(true);
    }
  });

  it('büyük harf farkı aranmaz', () => {
    expect(sozluktePayVar('KİTABI', sozluk)).toBe(true);
  });
});

describe('her şeyi kabul etmiyor', () => {
  it('uydurma kelimeler reddedilir', () => {
    for (const k of ['zxqwv', 'brtlmp', 'kkkkkk', 'şşşşş']) {
      expect(sozluktePayVar(k, sozluk), k).toBe(false);
    }
  });

  it('boş girdi reddedilir', () => {
    expect(sozluktePayVar('', sozluk)).toBe(false);
    expect(sozluktePayVar('   ', sozluk)).toBe(false);
  });

  it('çok kısa gövdeye inmeye çalışmaz', () => {
    // "aaa" soyulduğunda tek harf kalır; sözlükte tek harf yok.
    expect(sozluktePayVar('aaaa', sozluk)).toBe(false);
  });
});
