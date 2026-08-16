'use strict';
/* ============================================================
   ORTAK OYUN MANTIĞI
   Bu dosyayı hem tarayıcı hem sunucu kullanır. Tek kaynak olması
   şart: üretim sunucuda yapılır, doğrulama sunucuda yapılır,
   istemci sadece gösterir. "Buldum" diyen istemciye güvenilmez.
   ============================================================ */

const KUCUK = [1,2,3,4,5,6,7,8,9,10];
const BUYUK = [25,50,75,100];

const SEVIYELER = {
  cocuk:  {etiket:'Çocuk',  hane:2, tas:4, alt:10,    ust:99,    sure:0,  tolerans:[2,4],     buyukVar:false, ileri:false},
  kolay:  {etiket:'Kolay',  hane:3, tas:5, alt:100,   ust:499,   sure:90, tolerans:[3,8],     buyukVar:false, ileri:false},
  normal: {etiket:'Normal', hane:3, tas:6, alt:101,   ust:999,   sure:45, tolerans:[5,10],    buyukVar:true,  ileri:false},
  zor:    {etiket:'Zor',    hane:4, tas:6, alt:1000,  ust:9999,  sure:90, tolerans:[15,50],   buyukVar:true,  ileri:true},
  usta:   {etiket:'Usta',   hane:5, tas:7, alt:10000, ust:99999, sure:0,  tolerans:[100,500], buyukVar:true,  ileri:true}
};

/* ---------- Tohumlu rastgelelik ----------
   Math.random() kullanılamaz: "Günün Turu"nda herkesin aynı bulmacayı
   görmesi ve sunucunun aynı turu yeniden üretebilmesi gerekiyor.
   mulberry32 — 32 bit tohumdan deterministik akış. */
function rng(tohum){
  let t = tohum >>> 0;
  return function(){
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function tohumla(metin){                       // "2026-08-16:normal" -> sayı
  let h = 2166136261;
  for (let i=0;i<metin.length;i++){ h ^= metin.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function karistir(dizi, r){
  const a = dizi.slice();
  for (let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

/* ---------- İşlem kuralları (tek yerde) ---------- */
function uygula(a, b, islem){
  if (islem === '+') return a + b;
  if (islem === '×') return a * b;
  if (islem === '−') return a - b > 0 ? a - b : null;      // negatif ve sıfır yasak
  if (islem === '÷') return (b > 0 && a % b === 0) ? a / b : null;  // kalansız bölme şart
  return null;
}

/* ---------- Geriye arama (çözücü) ----------
   Küçük hedeflerde hem üretim hem "en iyi çözüm" için kullanılır. */
function coz(sayilar, hedef, sinirMs){
  sinirMs = sinirMs || 1500;
  const t0 = Date.now();
  let enIyi = {fark: Infinity, deger: null, adimlar: []};
  const gorulen = new Set();

  function ara(liste){
    for (const it of liste){
      const f = Math.abs(it.d - hedef);
      if (f < enIyi.fark) enIyi = {fark:f, deger:it.d, adimlar:it.yol};
      if (enIyi.fark === 0) return true;
    }
    if (liste.length < 2 || Date.now() - t0 > sinirMs) return false;
    const anahtar = liste.map(x=>x.d).sort((a,b)=>a-b).join(',');
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);

    for (let i=0;i<liste.length;i++){
      for (let j=i+1;j<liste.length;j++){
        const kalan = liste.filter((_,k)=>k!==i && k!==j);
        const a=liste[i], b=liste[j];
        const ust = a.d>=b.d?a:b, alt = a.d>=b.d?b:a;
        for (const islem of ['+','−','×','÷']){
          if (islem==='×' && alt.d===1) continue;          // işe yaramaz dal
          if (islem==='÷' && alt.d===1) continue;
          const sonuc = uygula(ust.d, alt.d, islem);
          if (sonuc === null) continue;
          const dugum = {d:sonuc, yol:ust.yol.concat(alt.yol,[{a:ust.d,b:alt.d,islem,sonuc}])};
          if (ara(kalan.concat([dugum]))) return true;
        }
      }
    }
    return false;
  }
  ara(sayilar.map(s=>({d:s, yol:[]})));
  return enIyi;
}

/* ---------- İleri üretim ----------
   4-5 hanede geriye arama %30'a düşüp saniyeler sürüyor. Burada
   çözüm aranmıyor, inşa ediliyor: rastgele geçerli bir zincir kurup
   sonucunu hedef ilan ediyoruz. Çözülebilirlik tanım gereği garanti. */
function ileriUret(S, buyukAdet, r, denemeSiniri){
  denemeSiniri = denemeSiniri || 4000;
  const buyuk = S.buyukVar ? Math.min(buyukAdet, S.tas) : 0;
  for (let t=0;t<denemeSiniri;t++){
    const sayilar = karistir(BUYUK, r).slice(0, buyuk)
      .concat(karistir(KUCUK.concat(KUCUK), r).slice(0, S.tas - buyuk));
    let liste = sayilar.map(d=>({d, yol:[]}));
    let tikandi = false;
    while (liste.length > 1){
      const i = Math.floor(r()*liste.length);
      let j = Math.floor(r()*(liste.length-1)); if (j>=i) j++;
      const a=liste[i], b=liste[j];
      const ust = a.d>=b.d?a:b, alt = a.d>=b.d?b:a;
      // Hedefe ne kadar yol kaldıysa çarpma o kadar ağırlıklanır,
      // yoksa rastgele toplama zinciri on binlere hiç ulaşmaz.
      const enBuyuk = liste.reduce((m,x)=>Math.max(m,x.d),1);
      const carpAgirlik = S.ust/enBuyuk > 50 ? 6 : S.ust/enBuyuk > 8 ? 3 : 1;
      const adaylar = [];
      for (const islem of ['+','−','×','÷']){
        if ((islem==='×'||islem==='÷') && alt.d===1) continue;
        const sonuc = uygula(ust.d, alt.d, islem);
        if (sonuc === null) continue;
        const tekrar = islem==='×' ? carpAgirlik : 1;
        for (let w=0;w<tekrar;w++) adaylar.push({islem, sonuc});
      }
      if (!adaylar.length){ tikandi = true; break; }
      const s = adaylar[Math.floor(r()*adaylar.length)];
      const dugum = {d:s.sonuc, yol:ust.yol.concat(alt.yol,[{a:ust.d,b:alt.d,islem:s.islem,sonuc:s.sonuc}])};
      liste = liste.filter((_,k)=>k!==i && k!==j).concat([dugum]);
    }
    if (tikandi) continue;
    const deger = liste[0].d;
    if (deger >= S.alt && deger <= S.ust)
      return {hedef:deger, adimlar:liste[0].yol, sayilar};
  }
  return null;
}

/* ---------- Tur üretimi (tek giriş kapısı) ----------
   tohum verilirse tur tekrar üretilebilir: günün turu, rövanş,
   maç kaydını sonradan yeniden oynatma hep buna dayanır. */
function turUret(seviyeAdi, secenek){
  secenek = secenek || {};
  const S = SEVIYELER[seviyeAdi];
  if (!S) throw new Error('Bilinmeyen seviye: ' + seviyeAdi);
  const tohum = secenek.tohum != null ? secenek.tohum : (Math.random()*4294967296) >>> 0;
  const r = rng(tohum);
  const buyukAdet = secenek.buyukAdet != null ? secenek.buyukAdet : (S.buyukVar ? 2 : 0);

  if (S.ileri){
    const u = ileriUret(S, buyukAdet, r);
    if (u) return {seviye:seviyeAdi, tohum, hedef:u.hedef, sayilar:u.sayilar,
                   cozum:{fark:0, deger:u.hedef, adimlar:u.adimlar}};
  } else {
    const buyuk = S.buyukVar ? Math.min(buyukAdet, S.tas) : 0;
    for (let t=0;t<80;t++){
      const sayilar = karistir(BUYUK, r).slice(0, buyuk)
        .concat(karistir(KUCUK.concat(KUCUK), r).slice(0, S.tas - buyuk));
      const hedef = S.alt + Math.floor(r()*(S.ust - S.alt + 1));
      const cozum = coz(sayilar, hedef, 300);
      if (cozum.fark === 0) return {seviye:seviyeAdi, tohum, hedef, sayilar, cozum};
    }
  }
  // Buraya düşmek pratikte imkânsız; yine de turu oynanabilir bırak.
  return turUret(seviyeAdi, {tohum: (tohum + 1) >>> 0, buyukAdet});
}

function gununTuru(seviyeAdi, tarihISO){
  const gun = tarihISO || new Date().toISOString().slice(0,10);
  return turUret(seviyeAdi, {tohum: tohumla(gun + ':' + seviyeAdi)});
}

/* ---------- Doğrulama (SUNUCUDA ÇALIŞIR) ----------
   İstemciden gelen adım zincirini baştan sona yeniden hesaplar.
   Her sayının en fazla bir kez kullanıldığını da burada kontrol eder. */
function dogrula(sayilar, adimlar, hedef){
  const havuz = sayilar.slice();
  const uret = [];                                   // ara sonuç taşları
  const hata = m => ({gecerli:false, hata:m});

  if (!Array.isArray(adimlar) || !adimlar.length) return hata('Adım yok.');
  if (adimlar.length > sayilar.length - 1) return hata('Adım sayısı taş sayısını aşıyor.');

  function tuket(deger){
    let i = havuz.indexOf(deger);
    if (i >= 0){ havuz.splice(i,1); return true; }
    i = uret.indexOf(deger);
    if (i >= 0){ uret.splice(i,1); return true; }
    return false;
  }

  let son = null;
  for (const ad of adimlar){
    if (!['+','−','×','÷'].includes(ad.islem)) return hata('Geçersiz işlem: ' + ad.islem);
    if (!Number.isInteger(ad.a) || !Number.isInteger(ad.b)) return hata('Tam sayı değil.');
    if (!tuket(ad.a)) return hata(ad.a + ' kullanılabilir değil.');
    if (!tuket(ad.b)) return hata(ad.b + ' kullanılabilir değil.');
    const sonuc = uygula(ad.a, ad.b, ad.islem);
    if (sonuc === null) return hata(ad.a + ' ' + ad.islem + ' ' + ad.b + ' kuraldışı.');
    if (sonuc !== ad.sonuc) return hata('Bildirilen sonuç yanlış: ' + ad.sonuc + ' ≠ ' + sonuc);
    uret.push(sonuc);
    son = sonuc;
  }
  return {gecerli:true, ulasilan:son, fark:Math.abs(son - hedef), adimSayisi:adimlar.length};
}

/* ---------- Puanlama ----------
   Yarışmanın 10/7/5 tablosu + hız primi. Hız primi sadece tam
   isabette verilir: yaklaşık cevabı hızlı vermek ödüllendirilmemeli. */
function puanla(seviyeAdi, fark, kalanSaniye, toplamSaniye, ilkBuzzer){
  const S = SEVIYELER[seviyeAdi];
  let taban = 0;
  if (fark === 0) taban = 10;
  else if (fark <= S.tolerans[0]) taban = 7;
  else if (fark <= S.tolerans[1]) taban = 5;

  let hiz = 0;
  if (taban === 10 && toplamSaniye > 0)
    hiz = Math.round(5 * Math.max(0, kalanSaniye) / toplamSaniye);   // 0-5
  const buzzer = (taban > 0 && ilkBuzzer) ? 2 : 0;
  return {taban, hiz, buzzer, toplam: taban + hiz + buzzer};
}

/* ---------- Joker ----------
   Kelime oyununda joker "harf açar". Sayıda bunun karşılığı çözümün
   bir adımını açmaktır — cevabı vermez, yolu daraltır. */
function joker(tur, tip, kullanilanAdim){
  if (tip === 'adim'){
    const i = kullanilanAdim || 0;
    const ad = tur.cozum.adimlar[i];
    return ad ? {tip, metin: ad.a + ' ' + ad.islem + ' ' + ad.b + ' = ' + ad.sonuc, indeks:i} : null;
  }
  if (tip === 'tas'){                                  // çözümde geçen bir taşı işaretle
    const kullanilan = new Set();
    tur.cozum.adimlar.forEach(a=>{ kullanilan.add(a.a); kullanilan.add(a.b); });
    const aday = tur.sayilar.filter(s=>kullanilan.has(s));
    return {tip, tas: aday[0] != null ? aday[0] : tur.sayilar[0]};
  }
  if (tip === 'sure') return {tip, ekSaniye: 15};
  return null;
}

const OYUN_API = {
  KUCUK, BUYUK, SEVIYELER,
  rng, tohumla, karistir, uygula,
  coz, ileriUret, turUret, gununTuru,
  dogrula, puanla, joker
};

/* Node'da require, tarayıcıda window.Oyun — aynı dosya iki ortamda çalışır */
if (typeof module !== 'undefined' && module.exports) module.exports = OYUN_API;
if (typeof window !== 'undefined') window.Oyun = OYUN_API;
