'use strict';
/* ============================================================
   DÜELLO DURUM MAKİNESİ
   Kelime Tahmin'in 1v1 akışının sayı oyununa uyarlaması:

     tur başlar → sıra BOŞTUR
     ilk "buzz" basan söz hakkını kapar (cevabımı biliyorum der)
     buzz basan sınırlı sürede geçerli zincir göndermek zorunda
       geçerliyse  → tur biter, puanlanır
       geçersiz / süre biterse → sıra rakibe geçer, kalan süreyle
     iki taraf da yapamazsa → tur puansız kapanır

   Kelime oyunundan asıl farkı: renk geri bildirimi yok. Onun yerine
   rakibin "en yakın" mesafesi canlı yayınlanır — yöntemi değil,
   yalnızca ne kadar yaklaştığı. Baskıyı üreten şey bu.
   ============================================================ */

const O = require('../ortak/oyun');

const TUR_SAYISI      = 5;
const BUZZ_SANIYE     = 20;   // buzz'a basanın cevap verme süresi
const TUR_SANIYE      = 60;   // turun toplam süresi
const JOKER_HAKKI     = {adim:1, tas:1, sure:1};

class Duello {
  constructor(oda, oyuncular, secenek){
    secenek = secenek || {};
    this.oda        = oda;
    this.oyuncular  = oyuncular;              // [{id, ad, bot}]
    this.seviye     = secenek.seviye || 'normal';
    this.turSayisi  = secenek.turSayisi || TUR_SAYISI;
    this.tohum      = secenek.tohum || ((Math.random()*4294967296)>>>0);
    this.turNo      = 0;
    this.puanlar    = {};
    this.jokerler   = {};
    this.gecmis     = [];
    oyuncular.forEach(p=>{
      this.puanlar[p.id]  = 0;
      this.jokerler[p.id] = Object.assign({}, JOKER_HAKKI);
    });
    this.tur = null;
  }

  /* Her turun tohumu maç tohumundan türer → maç tekrar oynatılabilir */
  turBaslat(){
    this.turNo++;
    if (this.turNo > this.turSayisi) return null;
    const tohum = O.tohumla(this.tohum + ':' + this.turNo);
    const uretilen = O.turUret(this.seviye, {tohum});
    this.tur = {
      no: this.turNo,
      hedef: uretilen.hedef,
      sayilar: uretilen.sayilar,
      cozum: uretilen.cozum,
      basladi: Date.now(),
      sahip: null,            // buzz'a basan
      denemis: [],            // bu turda hakkını harcayanlar
      bitti: false,
      enYakin: {}             // oyuncu -> en yakın mesafe (canlı gösterim)
    };
    // İstemciye çözüm GİTMEZ. Sadece tur bitince açılır.
    return {
      turNo: this.turNo,
      seviye: this.seviye,
      hedef: uretilen.hedef,
      sayilar: uretilen.sayilar,
      sure: TUR_SANIYE,
      buzzSure: BUZZ_SANIYE
    };
  }

  buzz(oyuncuId){
    const t = this.tur;
    if (!t || t.bitti) return {ok:false, sebep:'Tur kapalı.'};
    if (t.sahip) return {ok:false, sebep:'Söz hakkı zaten alınmış.'};
    if (t.denemis.includes(oyuncuId)) return {ok:false, sebep:'Bu turda hakkını kullandın.'};
    t.sahip = oyuncuId;
    t.buzzAn = Date.now();
    return {ok:true, sahip:oyuncuId, saniye:BUZZ_SANIYE};
  }

  /* Mesafe bildirimi: oyuncu çalışırken en yakın değerini yollar.
     Rakibe sadece mesafe gider, taşlar ve adımlar gitmez. */
  mesafe(oyuncuId, deger){
    const t = this.tur;
    if (!t || t.bitti || !Number.isInteger(deger)) return null;
    const fark = Math.abs(deger - t.hedef);
    const onceki = t.enYakin[oyuncuId];
    if (onceki == null || fark < onceki){ t.enYakin[oyuncuId] = fark; return {oyuncuId, fark}; }
    return null;
  }

  jokerKullan(oyuncuId, tip){
    const hak = this.jokerler[oyuncuId];
    if (!hak || !hak[tip]) return {ok:false, sebep:'Joker hakkın kalmadı.'};
    hak[tip]--;
    const sonuc = O.joker(this.tur, tip, 0);
    return {ok:true, joker:sonuc, kalan:hak};
  }

  /* Zincir gönderimi — tek doğrulama noktası burası */
  gonder(oyuncuId, adimlar){
    const t = this.tur;
    if (!t || t.bitti) return {ok:false, sebep:'Tur kapalı.'};
    if (t.sahip !== oyuncuId) return {ok:false, sebep:'Söz hakkı sende değil.'};

    const d = O.dogrula(t.sayilar, adimlar, t.hedef);
    if (!d.gecerli){
      // Kuraldışı zincir = hakkın yanar, sıra rakibe geçer
      return this.hakkiYak(oyuncuId, d.hata);
    }

    const kalan = Math.max(0, TUR_SANIYE - Math.round((Date.now()-t.basladi)/1000));
    const ilkBuzzer = t.denemis.length === 0;
    const p = O.puanla(this.seviye, d.fark, kalan, TUR_SANIYE, ilkBuzzer);

    if (p.toplam === 0) return this.hakkiYak(oyuncuId, 'Sonuç puan aralığının dışında.');

    this.puanlar[oyuncuId] += p.toplam;
    t.bitti = true;
    this.gecmis.push({tur:t.no, kazanan:oyuncuId, fark:d.fark, puan:p});
    return {
      ok:true, kazanan:oyuncuId, ulasilan:d.ulasilan, fark:d.fark,
      puan:p, puanlar:this.puanlar, cozum:t.cozum.adimlar, turBitti:true
    };
  }

  hakkiYak(oyuncuId, sebep){
    const t = this.tur;
    t.denemis.push(oyuncuId);
    t.sahip = null;
    const kalanlar = this.oyuncular.filter(p=>!t.denemis.includes(p.id));
    if (!kalanlar.length){
      t.bitti = true;
      this.gecmis.push({tur:t.no, kazanan:null});
      return {ok:false, sebep, turBitti:true, kazanan:null, cozum:t.cozum.adimlar};
    }
    return {ok:false, sebep, turBitti:false, siraGecti:kalanlar[0].id};
  }

  /* Süre dolduğunda dışarıdan çağrılır */
  turZamanAsimi(){
    const t = this.tur;
    if (!t || t.bitti) return null;
    t.bitti = true;
    this.gecmis.push({tur:t.no, kazanan:null, zamanAsimi:true});
    return {turBitti:true, kazanan:null, cozum:t.cozum.adimlar, puanlar:this.puanlar};
  }

  bittiMi(){ return this.turNo >= this.turSayisi && (!this.tur || this.tur.bitti); }

  sonuc(){
    const sirali = this.oyuncular.slice().sort((a,b)=>this.puanlar[b.id]-this.puanlar[a.id]);
    const berabere = this.puanlar[sirali[0].id] === this.puanlar[sirali[1] ? sirali[1].id : sirali[0].id];
    return {
      puanlar: this.puanlar,
      kazanan: berabere ? null : sirali[0].id,
      berabere,
      gecmis: this.gecmis,
      tohum: this.tohum        // rövanş ve tekrar oynatma için
    };
  }
}

module.exports = {Duello, TUR_SAYISI, BUZZ_SANIYE, TUR_SANIYE};
