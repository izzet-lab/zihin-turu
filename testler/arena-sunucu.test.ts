import { describe, it, expect } from 'vitest';
import {
  arenayiIlerlet,
  arenayiBaslat,
  turUret,
  uzaklikHesapla,
  ARENA_BEKLEME_SN,
  type ArenaMac,
} from '../sunucu/fonksiyonlar/arena-ortak';
import { ARENA_KOLTUK, ARENA_TUR_SAYISI } from '@zihinturu/cekirdek';

/*
  ARENA SUNUCU MANTIĞI

  `arenayiIlerlet` arenanın kalbi: botları oynatır, süresi dolan turları
  kapatır, puanları yazar, podyumu çıkarır. Gerçek bir arena beş kimlikli
  oyuncu ve ağ ister; bu testler bunun yerine veritabanının yerine geçen
  küçük bir taklit kullanıyor — düello testlerindeki yaklaşımın aynısı.
*/

type Satir = Record<string, unknown>;

class SahteDb {
  tablolar: Record<string, Satir[]> = {
    arena_mac: [],
    arena_koltuk: [],
    arena_tur: [],
  };
  from(tablo: string) {
    return new Sorgu(this, tablo);
  }
}

class Sorgu {
  private filtreler: [string, unknown][] = [];
  private islem: 'select' | 'update' | 'upsert' | 'insert' | 'delete' = 'select';
  private veri: Satir | Satir[] | null = null;
  private siralamaAlani: string | null = null;

  constructor(private db: SahteDb, private tablo: string) {}

  select() {
    return this;
  }
  eq(alan: string, deger: unknown) {
    this.filtreler.push([alan, deger]);
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
  insert(veri: Satir | Satir[]) {
    this.islem = 'insert';
    this.veri = veri;
    return this;
  }

  private eslesenler(): Satir[] {
    let satirlar = this.db.tablolar[this.tablo] ?? [];
    for (const [alan, deger] of this.filtreler) {
      satirlar = satirlar.filter((s) => s[alan] === deger);
    }
    if (this.siralamaAlani) {
      const alan = this.siralamaAlani;
      satirlar = [...satirlar].sort((a, b) =>
        String(a[alan]).localeCompare(String(b[alan])),
      );
    }
    return satirlar;
  }

  private anahtarlar(): string[] {
    if (this.tablo === 'arena_tur') return ['mac_id', 'tur_no', 'koltuk'];
    if (this.tablo === 'arena_koltuk') return ['mac_id', 'koltuk'];
    return ['id'];
  }

  private uygula(): { data: unknown } {
    if (this.islem === 'update') {
      const etkilenen = this.eslesenler();
      for (const s of etkilenen) Object.assign(s, this.veri);
      return { data: etkilenen.map((s) => ({ id: s.id })) };
    }
    if (this.islem === 'insert' || this.islem === 'upsert') {
      const gelenler = Array.isArray(this.veri) ? this.veri : [this.veri!];
      for (const yeni of gelenler) {
        const anahtar = this.anahtarlar();
        const mevcut = (this.db.tablolar[this.tablo] ?? []).find((s) =>
          anahtar.every((a) => s[a] === yeni[a]),
        );
        if (mevcut) Object.assign(mevcut, yeni);
        else this.db.tablolar[this.tablo]!.push({ ...yeni });
      }
      return { data: null };
    }
    return { data: this.eslesenler() };
  }

  async maybeSingle() {
    return { data: this.eslesenler()[0] ?? null };
  }
  async single() {
    return { data: this.eslesenler()[0] ?? null };
  }
  then<T>(coz: (deger: { data: unknown }) => T) {
    return Promise.resolve(this.uygula()).then(coz);
  }
}

const SEVIYE = 'normal';

function arenaKur(opts: {
  gercekOyuncu: number;
  turBasladiOnceMs?: number;
  durum?: string;
}): { db: SahteDb; mac: ArenaMac } {
  const db = new SahteDb();
  const basladi = new Date(Date.now() - (opts.turBasladiOnceMs ?? 0)).toISOString();
  const mac: ArenaMac = {
    id: 'arena-1',
    seviye: SEVIYE,
    tohum: 987654,
    durum: opts.durum ?? 'basladi',
    aktif_tur: 1,
    tur_basladi: basladi,
    olusturuldu: basladi,
  };
  db.tablolar.arena_mac = [{ ...mac } as Satir];
  for (let k = 1; k <= opts.gercekOyuncu; k++) {
    db.tablolar.arena_koltuk!.push({
      mac_id: mac.id,
      koltuk: k,
      oyuncu_id: `oyuncu-${k}`,
      bot_profil: null,
      bot_ad: null,
      puan: 0,
      toplam_uzaklik: 0,
      ayrildi: false,
    });
  }
  return { db, mac };
}

describe('turun bulmacası', () => {
  it('aynı arena ve tur hep aynı bulmacayı verir', () => {
    const { mac } = arenaKur({ gercekOyuncu: 1 });
    expect(turUret(mac, 3).hedef).toBe(turUret(mac, 3).hedef);
  });

  it('her tur farklı bulmaca gösterir', () => {
    const { mac } = arenaKur({ gercekOyuncu: 1 });
    const hedefler = [1, 2, 3, 4, 5].map((n) => turUret(mac, n).hedef);
    expect(new Set(hedefler).size).toBeGreaterThan(1);
  });

  it('uydurma zincir reddedilir — sunucu istemciye güvenmez', () => {
    const { mac } = arenaKur({ gercekOyuncu: 1 });
    expect(uzaklikHesapla(mac, 1, [{ a: 999, b: 998, islem: '+', sonuc: 1997 }])).toBeNull();
  });
});

describe('koltuklar botla dolar', () => {
  it('eksik koltuklar bot ile tamamlanır ve arena başlar', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 2, durum: 'bekliyor' });
    await arenayiBaslat(db, mac);

    const koltuklar = db.tablolar.arena_koltuk!;
    expect(koltuklar).toHaveLength(ARENA_KOLTUK);
    expect(koltuklar.filter((k) => k.bot_profil != null)).toHaveLength(3);
    expect(db.tablolar.arena_mac![0]!.durum).toBe('basladi');
  });

  it('beş gerçek oyuncu varsa bot eklenmez', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 5, durum: 'bekliyor' });
    await arenayiBaslat(db, mac);
    expect(db.tablolar.arena_koltuk!.filter((k) => k.bot_profil != null)).toHaveLength(0);
  });

  it('botların gücü aynı değil — beş aynı bot yarışı yapay yapardı', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 1, durum: 'bekliyor' });
    await arenayiBaslat(db, mac);
    const profiller = db.tablolar
      .arena_koltuk!.filter((k) => k.bot_profil != null)
      .map((k) => k.bot_profil);
    expect(new Set(profiller).size).toBeGreaterThan(1);
  });
});

describe('botlar oynuyor', () => {
  it('gecikmesi dolmadan bot cevap vermez', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 1 });
    await arenayiBaslat(db, mac);
    await arenayiIlerlet(db, { ...mac, durum: 'basladi' });
    expect(db.tablolar.arena_tur).toHaveLength(0);
  });

  it('gecikmesi dolunca botlar cevaplarını yazar', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 1, turBasladiOnceMs: 45_000 });
    await arenayiBaslat(db, mac);
    // Başlatma tur saatini şimdiye çeker; geçmişe alıp botları uyandır.
    const eski = new Date(Date.now() - 45_000).toISOString();
    db.tablolar.arena_mac![0]!.tur_basladi = eski;
    await arenayiIlerlet(db, { ...mac, tur_basladi: eski, durum: 'basladi' });
    expect(db.tablolar.arena_tur!.length).toBeGreaterThan(0);
  });
});

describe('tur ve puan akışı', () => {
  it('süresi dolan tur kapanır, sıradaki açılır', async () => {
    // Normal seviyenin süresi 60 sn.
    const { db, mac } = arenaKur({ gercekOyuncu: 5, turBasladiOnceMs: 70_000 });
    await arenayiIlerlet(db, mac);
    expect(db.tablolar.arena_mac![0]!.aktif_tur).toBe(2);
  });

  it('puan sıraya göre dağılır ve koltuklara yazılır', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 3, turBasladiOnceMs: 70_000 });
    const simdi = new Date().toISOString();
    db.tablolar.arena_tur = [
      { mac_id: mac.id, tur_no: 1, koltuk: 1, uzaklik: 10, kilitli: false, bildirildi: simdi },
      { mac_id: mac.id, tur_no: 1, koltuk: 2, uzaklik: 2, kilitli: false, bildirildi: simdi },
      { mac_id: mac.id, tur_no: 1, koltuk: 3, uzaklik: 50, kilitli: false, bildirildi: simdi },
    ];
    await arenayiIlerlet(db, mac);

    const puan = (k: number) =>
      Number(db.tablolar.arena_koltuk!.find((s) => s.koltuk === k)!.puan);
    // 2. koltuk en yakın: en çok puanı o alır.
    expect(puan(2)).toBeGreaterThan(puan(1));
    expect(puan(1)).toBeGreaterThan(puan(3));
  });

  it('herkes kilitlerse tur süreyi beklemeden kapanır', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 2 });
    const simdi = new Date().toISOString();
    db.tablolar.arena_tur = [
      { mac_id: mac.id, tur_no: 1, koltuk: 1, uzaklik: 5, kilitli: true, bildirildi: simdi },
      { mac_id: mac.id, tur_no: 1, koltuk: 2, uzaklik: 9, kilitli: true, bildirildi: simdi },
    ];
    await arenayiIlerlet(db, mac);
    expect(db.tablolar.arena_mac![0]!.aktif_tur).toBe(2);
  });

  it('uzun süre kimse dönmezse arena sonuna kadar ilerler ve biter', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 5, turBasladiOnceMs: 60_000 * 7 });
    const sonuc = await arenayiIlerlet(db, mac);
    expect(sonuc.durum.bitti).toBe(true);
    expect(db.tablolar.arena_mac![0]!.durum).toBe('bitti');
    expect(sonuc.podyum).not.toBeNull();
  });

  it('arena beş turu aşmaz', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 5, turBasladiOnceMs: 60_000 * 20 });
    await arenayiIlerlet(db, mac);
    expect(Number(db.tablolar.arena_mac![0]!.aktif_tur)).toBeLessThanOrEqual(
      ARENA_TUR_SAYISI,
    );
  });
});

describe('podyum', () => {
  it('bitince beş sıralı satır döner ve ilk üçte madalya var', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 5, turBasladiOnceMs: 60_000 * 7 });
    const sonuc = await arenayiIlerlet(db, mac);
    expect(sonuc.podyum).toHaveLength(5);
    expect(sonuc.podyum![0]!.sira).toBe(1);
    expect(sonuc.podyum!.filter((p) => p.madalya != null)).toHaveLength(3);
  });

  it('ayrılan yarışçı podyumda en sonda ve madalyasız', async () => {
    const { db, mac } = arenaKur({ gercekOyuncu: 5, turBasladiOnceMs: 60_000 * 7 });
    db.tablolar.arena_koltuk!.find((k) => k.koltuk === 1)!.ayrildi = true;
    const sonuc = await arenayiIlerlet(db, mac);
    const son = sonuc.podyum![sonuc.podyum!.length - 1]!;
    expect(son.koltuk).toBe('1');
    expect(son.madalya).toBeNull();
  });
});

describe('bekleme süresi', () => {
  it('on saniye — oyuncuyu boş ekranda tutmayacak kadar kısa', () => {
    expect(ARENA_BEKLEME_SN).toBeGreaterThan(0);
    expect(ARENA_BEKLEME_SN).toBeLessThanOrEqual(15);
  });
});
