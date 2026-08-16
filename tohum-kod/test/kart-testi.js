'use strict';
/* Tuval, Node'da yok. Çizim çağrılarını kaydeden sahte bir bağlam
   kurup kartın ne yazdığını denetliyoruz. Asıl amaç: çözüm
   adımlarının karta sızmadığını kanıtlamak. */

const fs = require('fs');
const yol = require('path');
const O = require('../ortak/oyun');

let gecti = 0, kaldi = 0;
const kontrol = (ad, kosul, ek)=>{
  if (kosul){ gecti++; console.log('  ✓ ' + ad + (ek ? '  ' + ek : '')); }
  else { kaldi++; console.log('  ✗ ' + ad + (ek ? '  ' + ek : '')); }
};

function sahteTuval(){
  const yazilar = [], cagrilar = [];
  const gecis = {addColorStop(){}};
  const c = {
    yazilar, cagrilar,
    canvas:null, font:'', fillStyle:'', strokeStyle:'', lineWidth:1,
    textAlign:'', textBaseline:'', letterSpacing:'', shadowColor:'', shadowBlur:0,
    createRadialGradient(){ cagrilar.push('radial'); return gecis; },
    createLinearGradient(){ cagrilar.push('linear'); return gecis; },
    fillRect(){ cagrilar.push('fillRect'); },
    beginPath(){}, moveTo(){}, arcTo(){}, closePath(){},
    fill(){ cagrilar.push('fill'); }, stroke(){ cagrilar.push('stroke'); },
    save(){}, restore(){},
    measureText(m){ return {width: String(m).length * 26}; },
    fillText(m){ yazilar.push(String(m)); }
  };
  return {
    getContext(){ return c; }, width:0, height:0, _c:c,
    toDataURL(){ return 'data:image/png;base64,SAHTE'; },
    toBlob(geri){ geri({sahteBlob:true, size:1234}); }
  };
}

// kart.js tarayıcı bekliyor; asgari kabuk kuruyoruz
global.window = {};
global.document = {createElement: ()=>sahteTuval(), fonts:{ready:Promise.resolve()}};
eval(fs.readFileSync(yol.join(__dirname,'../istemci/kart.js'),'utf8'));
const Kart = global.window.Kart;

console.log('\n[1] Kart API');
kontrol('window.Kart yayınlandı', !!Kart && typeof Kart.ciz === 'function');
kontrol('Kart boyutu kare 1080', Kart.BOYUT === 1080);

console.log('\n[2] Tam isabet kartı');
const tur = O.gununTuru('normal','2026-08-16');
const kayit = {
  seviye:'normal', hedef:tur.hedef, ulasilan:tur.hedef, fark:0,
  puan:15, sure:32, adim:tur.cozum.adimlar.length,
  cozum:tur.cozum.adimlar, gunluk:true, tarih:'2026-08-16'
};
const t1 = sahteTuval();
Kart.ciz(t1, kayit, 'Normal', O.SEVIYELER.normal.tolerans, 4);
const y1 = t1._c.yazilar;

kontrol('Hedef karta yazıldı', y1.includes(String(tur.hedef)), 'hedef=' + tur.hedef);
kontrol('Tam isabet ibaresi var', y1.some(m=>/TAM İSABET/.test(m)));
kontrol('Tarih ve seviye var', y1.some(m=>/16\.08/.test(m) && /Normal/.test(m)));
kontrol('Adım, süre, puan kutuları çizildi',
        y1.includes('32 sn') && y1.includes('15') && y1.some(m=>m==='ADIM'));
kontrol('Seri satırı geldi', y1.some(m=>/4 günlük seri/.test(m)));
kontrol('Günün turu ibaresi var', y1.some(m=>/HERKES AYNI TURU/.test(m)));

console.log('\n[3] Çözüm sızıntısı denetimi');
const hepsi = y1.join(' | ');
kontrol('Kartta "=" işareti yok', !hepsi.includes('='), 'adımlar sızarsa cevap verilmiş olur');
kontrol('Kartta işlem işaretleri yok', !/[×÷−]/.test(hepsi));
const araSonuclar = tur.cozum.adimlar.map(a=>a.sonuc).filter(s=>s !== tur.hedef);
const sizan = araSonuclar.filter(s=>y1.includes(String(s)));
kontrol('Ara sonuçlar karta girmedi', sizan.length === 0, sizan.length ? 'sızan: '+sizan : '');

console.log('\n[4] Yaklaşık ve başarısız kart');
const t2 = sahteTuval();
Kart.ciz(t2, Object.assign({}, kayit, {ulasilan:tur.hedef-3, fark:3, puan:7}), 'Normal', [5,10], 1);
kontrol('Yaklaşık sonuçta fark yazıyor', t2._c.yazilar.some(m=>/3 FARK/.test(m)));
kontrol('Seri 1 iken seri satırı yok', !t2._c.yazilar.some(m=>/günlük seri/.test(m)));

const t3 = sahteTuval();
Kart.ciz(t3, Object.assign({}, kayit, {ulasilan:null, fark:Infinity, puan:0, adim:0}), 'Normal', [5,10], 0);
kontrol('Hiç işlem yapılmadıysa "SONUÇ YOK"', t3._c.yazilar.some(m=>/SONUÇ YOK/.test(m)));

console.log('\n[5] Uzun hedef taşmıyor');
const t4 = sahteTuval();
Kart.ciz(t4, Object.assign({}, kayit, {hedef:98765, ulasilan:98765, seviye:'usta'}), 'Usta', [100,500], 0);
kontrol('5 haneli hedef çizildi', t4._c.yazilar.includes('98765'));
kontrol('Çizim çökmeden tamamlandı', t4._c.cagrilar.length > 10, t4._c.cagrilar.length + ' çizim çağrısı');

console.log('\n[6] Paylaşım akışı — otomatik indirme olmamalı');
(function(){
  const eklenen = [];
  const kutu = {
    innerHTML:'', classList:{remove(){}, add(){}},
    appendChild(el){ eklenen.push(el); }
  };
  const olusturulan = [];
  global.document.createElement = etiket => {
    if (etiket === 'canvas') return sahteTuval();
    const el = {tag:etiket, style:{cssText:''}, classList:{add(){},remove(){}},
                className:'', textContent:'', href:'', download:'', src:'', alt:'',
                click(){ olusturulan.push('TIKLANDI:' + etiket); },
                appendChild(){}, remove(){}};
    return el;
  };
  global.URL = {createObjectURL:()=>'blob:sahte', revokeObjectURL(){}};
  // Node 22'de navigator salt okunur; tanımı değiştirerek eziyoruz
  Object.defineProperty(globalThis, 'navigator', {value:{}, configurable:true});
  global.File = function(){};

  let sonuc = null;
  Kart.paylas(kayit, 'Normal', [5,10], 4, 'metin', kutu).then(s=>{ sonuc = s; });

  setTimeout(()=>{
    kontrol('Paylaşım desteklenmiyorsa "gosterildi" dönüyor', sonuc === 'gosterildi', String(sonuc));
    kontrol('Otomatik indirme TETİKLENMEDİ', olusturulan.length === 0,
            olusturulan.length ? olusturulan.join(',') : 'hiç click() çağrılmadı');
    kontrol('Görsel sayfaya eklendi', eklenen.some(e=>e.tag === 'img'));
    kontrol('İndirme bağlantısı kullanıcıya bırakıldı',
            eklenen.some(e=>e.tag === 'a' && e.download));
    kontrol('Kaydetme ipucu gösterildi', eklenen.some(e=>/basılı tutup/i.test(e.textContent)));

    console.log('\n' + '─'.repeat(46));
    console.log(`SONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
    process.exit(kaldi ? 1 : 0);
  }, 250);
})();
/* akış testi süreci sonlandırır */
