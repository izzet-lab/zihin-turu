import { describe, it, expect, beforeEach } from 'vitest';
import { macIlerlet, uzaklikHesapla, turUret, type Mac } from '../sunucu/fonksiyonlar/duello-ortak';
import { DUELLO_TUR_SAYISI } from '@zihinturu/cekirdek';

/*
  DÜELLO SUNUCU MANTIĞI

  `macIlerlet` düellonun kalbi: botu oynatır, süresi dolan turları
  kapatır, maçı bitirir ve dereceleri günceller. Gerçek bir maç iki
  kimlikli oyuncu ve ağ ister; bu testler bunun yerine veritabanının
  yerine geçen küçük bir taklit kullanıyor.

  Böylece şunlar ağ olmadan doğrulanabiliyor:
  - Bot gerçekten oynuyor mu, ve gecikmesi dolmadan cevap vermiyor mu?
  - Süresi dolan tur kimse cevap göndermese bile kapanıyor mu?
  - Beş tur dolunca maç bitiyor mu?
  - Bota karşı derece değişmiyor mu?
*/

/* ------------------------------------------------------------------ */
/* Veritabanı taklidi                                                  */
/* ------------------------------------------------------------------ */

type Satir = Record<string, unknown>;

class SahteDb {
  tablolar: Record<string, Satir[]> = {
    duello_mac: [],
    duello_tur: [],
    duello_derece: [],
  };

  from(tablo: string) {
    return new Sorgu(this, tablo);
  }
}

class Sorgu {
  private filtreler: [string, unknown][] = [];
  private islem: 'select' | 'update' | 'upsert' | 'delete' = 'select';
  private veri: Satir | Satir[] | null = null;
  private siralamaAlani: string | null = null;
  private icinde: [string, unknown[]] | null = null;

  constructor(private db: SahteDb, private tablo: string) {}

  select() {
    if (this.islem === 'select') this.islem = 'select';
    return this;
  }
  eq(alan: string, deger: unknown) {
    this.filtreler.push([alan, deger]);
    return this;
  }
  in(alan: string, degerler: unknown[]) {
    this.icinde = [alan, degerler];
    return this;
  }
  order(alan: string) {
    this.siralamaAlani = alan;
    return this;
  }
  update(veri: Satir) {
    this.islem = 'update';
    this.veri = veri;
    return this;
  }
  upsert(veri: Satir | Satir[]) {
    this.islem = 'upsert';
    this.veri = veri;
    return this;
  }

  private eslesenler(): Satir[] {
    let satirlar = this.db.tablolar[this.tablo] ?? [];
    for (const [alan, deger] of this.filtreler) {
      satirlar = satirlar.filter((s) => s[alan] === deger);
    }
    if (this.icinde) {
      const [alan, degerler] = this.icinde;
      satirlar = satirlar.filter((s) => degerler.includes(s[alan]));
    }
    if (this.siralamaAlani) {
      const alan = this.siralamaAlani;
      satirlar = [...satirlar].sort((a, b) =>
        String(a[alan]).localeCompare(String(b[alan])),
      );
    }
    return satirlar;
  }

  private uygula(): { data: unknown } {
    if (this.islem === 'update') {
      const etkilenen = this.eslesenler();
      for (const s of etkilenen) Object.assign(s, this.veri);
      // Gerçek Supabase gibi: .select() zincirlenmişse değişen satırlar döner.
      return { data: etkilenen.map((s) => ({ id: s.id })) };
    }
    if (this.islem === 'upsert') {
      const gelenler = Array.isArray(this.veri) ? this.veri : [this.veri!];
      for (const yeni of gelenler) {
        const anahtarlar =
          this.tablo === 'duello_tur'
            ? ['mac_id', 'tur_no', 'taraf']
            : ['oyuncu_id'];
        const mevcut = (this.db.tablolar[this.tablo] ?? []).find((s) =>
          anahtarlar.every((a) => s[a] === yeni[a]),
        );
        if (mevcut) Object.assign(mevcut, yeni);
        else this.db.tablolar[this.tablo]!.push({ ...yeni });
      }
      return { data: null };
    }
    return { data: this.eslesenler() };
  }

  async maybeSingle() {
    const satirlar = this.eslesenler();
    return { data: satirlar[0] ?? null };
  }
  async single() {
    const satirlar = this.eslesenler();
    return { data: satirlar[0] ?? null };
  }

  // Zincir doğrudan await edilebilsin diye (ör. update(...).eq(...)).
  then<T>(coz: (deger: { data: unknown }) => T) {
    return Promise.resolve(this.uygula()).then(coz);
  }
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const SEVIYE = 'normal';

function botMaci(basladiMsOnce: number): Mac {
  return {
    id: 'mac-1',
    seviye: SEVIYE,
    tohum: 123456,
    oyuncu_a: 'oyuncu-1',
    oyuncu_b: null,
    bot_profil: 'usta',
    bot_ad: 'Test Bot',
    aktif_tur: 1,
    tur_basladi: new Date(Date.now() - basladiMsOnce).toISOString(),
    durum: 'basladi',
    skor_a: 0,
    skor_b: 0,
    kazanan: null,
  };
}

function kisiMaci(basladiMsOnce: number): Mac {
  return {
    ...botMaci(basladiMsOnce),
    oyuncu_b: 'oyuncu-2',
    bot_profil: null,
    bot_ad: null,
  };
}

function kur(mac: Mac): SahteDb {
  const db = new SahteDb();
  db.tablolar.duello_mac = [{ ...mac } as Satir];
  return db;
}

/* ------------------------------------------------------------------ */
/* Testler                                                             */
/* ------------------------------------------------------------------ */

describe('turun bulmacası', () => {
  it('aynı maç ve tur hep aynı bulmacayı verir', () => {
    const mac = botMaci(0);
    const a = turUret(mac, 2);
    const b = turUret(mac, 2);
    expect(a.hedef).toBe(b.hedef);
    expect(a.sayilar).toEqual(b.sayilar);
  });

  it('her tur farklı bulmaca gösterir', () => {
    const mac = botMaci(0);
    const hedefler = [1, 2, 3, 4, 5].map((n) => turUret(mac, n).hedef);
    expect(new Set(hedefler).size).toBeGreaterThan(1);
  });

  it('geçersiz zincir reddedilir — sunucu istemciye güvenmez', () => {
    const mac = botMaci(0);
    // Rafta olmayan sayılarla uydurma bir adım
    const sahte = [{ a: 999, b: 998, islem: '+' as const, sonuc: 1997 }];
    expect(uzaklikHesapla(mac, 1, sahte)).toBeNull();
  });

  it('hiç adım atılmazsa uzaklık hedefin kendisidir', () => {
    const mac = botMaci(0);
    expect(uzaklikHesapla(mac, 1, [])).toBe(turUret(mac, 1).hedef);
  });
});

describe('bot oynuyor mu', () => {
  let db: SahteDb;

  beforeEach(() => {
    db = kur(botMaci(0));
  });

  it('gecikmesi dolmadan botun cevabı sayılmaz', async () => {
    // Botun planı tur başında BİR kez hesaplanıp yazılır (çözücü her
    // yoklamada yeniden çalışmasın diye), ama `bildirildi` gelecekte
    // olduğu için o an gelene kadar yok sayılır.
    const mac = botMaci(0);
    const durum = await macIlerlet(db, mac);

    const botSatiri = db.tablolar.duello_tur!.find((s) => s.taraf === 'b');
    if (botSatiri) {
      expect(Date.parse(botSatiri.bildirildi as string)).toBeGreaterThan(Date.now());
    }
    // Önemli olan: tur hâlâ açık ve bot puan almamış.
    expect(durum.turAcik).toBe(true);
    expect(durum.skor.b).toBe(0);
  });

  it('gecikmesi dolunca bot cevabını yazar', async () => {
    // Usta profilinin en uzun gecikmesi 11 sn; 30 sn geçmişse kesin oynamıştır.
    const mac = botMaci(30_000);
    db = kur(mac);
    await macIlerlet(db, mac);
    const botSatirlari = db.tablolar.duello_tur!.filter((s) => s.taraf === 'b');
    expect(botSatirlari.length).toBeGreaterThan(0);
    expect(typeof botSatirlari[0]!.uzaklik).toBe('number');
  });

  it('botun cevabı da doğrulanmış — uzaklık gerçek bulmacaya ait', async () => {
    const mac = botMaci(30_000);
    db = kur(mac);
    await macIlerlet(db, mac);
    const satir = db.tablolar.duello_tur!.find((s) => s.taraf === 'b')!;
    expect(satir.uzaklik as number).toBeGreaterThanOrEqual(0);
    expect(satir.uzaklik as number).toBeLessThanOrEqual(turUret(mac, 1).hedef);
  });
});

describe('tur kimse cevap vermese de ilerliyor', () => {
  it('süresi dolan tur kapanır ve sonraki tur açılır', async () => {
    // Normal seviyenin süresi 60 sn; 70 sn önce başlamış bir tur dolmuştur.
    const mac = kisiMaci(70_000);
    const db = kur(mac);
    await macIlerlet(db, mac);
    const son = db.tablolar.duello_mac![0]!;
    expect(son.aktif_tur).toBe(2);
    expect(son.durum).toBe('basladi');
  });

  it('kimse cevap vermediyse tur berabere biter, skor değişmez', async () => {
    const mac = kisiMaci(70_000);
    const db = kur(mac);
    await macIlerlet(db, mac);
    const son = db.tablolar.duello_mac![0]!;
    expect(son.skor_a).toBe(0);
    expect(son.skor_b).toBe(0);
  });

  it('uzun süre kimse dönmezse maç sonuna kadar ilerler ve biter', async () => {
    // Beş turun tamamının süresi dolmuş: 5 x 60 sn'den fazla.
    const mac = kisiMaci(60_000 * 6);
    const db = kur(mac);
    const durum = await macIlerlet(db, mac);
    expect(durum.bitti).toBe(true);
    const son = db.tablolar.duello_mac![0]!;
    expect(son.durum).toBe('bitti');
    expect(son.kazanan).toBe('berabere'); // kimse oynamadı
  });

  it('maç en fazla beş tur sürer', async () => {
    const mac = kisiMaci(60_000 * 20);
    const db = kur(mac);
    await macIlerlet(db, mac);
    const son = db.tablolar.duello_mac![0]!;
    expect(Number(son.aktif_tur)).toBeLessThanOrEqual(DUELLO_TUR_SAYISI);
  });
});

describe('derece', () => {
  it('bota karşı maç dereceyi değiştirmez', async () => {
    const mac = botMaci(60_000 * 20);
    const db = kur(mac);
    await macIlerlet(db, mac);
    expect(db.tablolar.duello_derece).toHaveLength(0);
  });

  it('gerçek rakibe karşı maç bitince derece yazılır', async () => {
    const mac = kisiMaci(60_000 * 6);
    const db = kur(mac);
    await macIlerlet(db, mac);
    expect(db.tablolar.duello_derece).toHaveLength(2);
    const toplam = db.tablolar.duello_derece!.reduce(
      (t, d) => t + (d.elo as number),
      0,
    );
    // Berabere biten maçta iki oyuncu da 1200'de kalır; toplam korunur.
    expect(toplam).toBe(2400);
  });

  it('maç iki kez ilerletilse bile derece bir kez yazılır', async () => {
    const mac = kisiMaci(60_000 * 6);
    const db = kur(mac);
    await macIlerlet(db, mac);
    expect(db.tablolar.duello_derece!.map((d) => d.mac_sayisi)).toEqual([1, 1]);

    // İki istek aynı anda maçı bitirmeye çalışırsa (ya da istemci iki kez
    // sorarsa) sayaç şişmemeli: maç zaten 'bitti' olduğu için ikinci
    // bitirme satırı değiştiremez ve dereceye dokunulmaz.
    await macIlerlet(db, mac);
    expect(db.tablolar.duello_derece!.map((d) => d.mac_sayisi)).toEqual([1, 1]);
  });
});
