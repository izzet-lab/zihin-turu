'use strict';
const O = require('../ortak/oyun');
const {sunucu} = require('../sunucu/index');
const {io: istemci} = require('socket.io-client');

const PORT = 3111;
let basarili = 0, basarisiz = 0;
const kontrol = (ad, kosul, ek) => {
  if (kosul){ basarili++; console.log('  ✓ ' + ad + (ek?'  '+ek:'')); }
  else { basarisiz++; console.log('  ✗ ' + ad + (ek?'  '+ek:'')); }
};

/* ---------- 1. Saf mantık testleri ---------- */
console.log('\n[1] Ortak mantık');

const t1 = O.turUret('normal', {tohum: 12345});
const t2 = O.turUret('normal', {tohum: 12345});
kontrol('Aynı tohum aynı turu üretiyor', t1.hedef === t2.hedef && t1.sayilar.join()===t2.sayilar.join(), 'hedef='+t1.hedef);

const g1 = O.gununTuru('normal','2026-08-16');
const g2 = O.gununTuru('normal','2026-08-16');
const g3 = O.gununTuru('normal','2026-08-17');
kontrol('Günün turu herkeste aynı', g1.hedef === g2.hedef, 'hedef='+g1.hedef);
kontrol('Ertesi gün farklı', g1.hedef !== g3.hedef || g1.sayilar.join()!==g3.sayilar.join());

for (const sv of Object.keys(O.SEVIYELER)){
  let tam = 0;
  const t0 = Date.now();
  for (let i=0;i<200;i++){ const t = O.turUret(sv,{tohum:i*7919}); if (t.cozum.fark===0) tam++; }
  kontrol(sv+' seviyesinde 200/200 tam çözümlü', tam===200, tam+'/200, '+(Date.now()-t0)+'ms');
}

/* Doğrulama: hile senaryoları */
const tur = O.turUret('normal',{tohum:999});
const dogru = O.dogrula(tur.sayilar, tur.cozum.adimlar, tur.hedef);
kontrol('Geçerli zincir kabul ediliyor', dogru.gecerli && dogru.fark===0);

const olmayanTas = O.dogrula(tur.sayilar, [{a:9999,b:1,islem:'+',sonuc:10000}], tur.hedef);
kontrol('Olmayan taş reddediliyor', !olmayanTas.gecerli, olmayanTas.hata);

const ikiKez = O.dogrula([5,5,3], [
  {a:5,b:5,islem:'+',sonuc:10},{a:10,b:10,islem:'+',sonuc:20}
], 20);
kontrol('Aynı sonucu iki kez kullanmak reddediliyor', !ikiKez.gecerli, ikiKez.hata);

const yanlisSonuc = O.dogrula([4,2], [{a:4,b:2,islem:'+',sonuc:99}], 99);
kontrol('Yalan sonuç bildirimi reddediliyor', !yanlisSonuc.gecerli, yanlisSonuc.hata);

const kalanli = O.dogrula([7,2], [{a:7,b:2,islem:'÷',sonuc:3.5}], 3);
kontrol('Kalanlı bölme reddediliyor', !kalanli.gecerli, kalanli.hata);

const negatif = O.dogrula([2,7], [{a:2,b:7,islem:'−',sonuc:-5}], -5);
kontrol('Negatif sonuç reddediliyor', !negatif.gecerli, negatif.hata);

const p = O.puanla('normal', 0, 40, 60, true);
kontrol('Tam isabet + hız + buzzer primi', p.taban===10 && p.hiz>0 && p.buzzer===2, JSON.stringify(p));
const p2 = O.puanla('normal', 3, 40, 60, true);
kontrol('Yaklaşık cevaba hız primi verilmiyor', p2.taban===7 && p2.hiz===0, JSON.stringify(p2));

/* ---------- 2. Uçtan uca düello ---------- */
console.log('\n[2] Sunucu üzerinden düello (insan + bot)');

sunucu.listen(PORT, async ()=>{
  const s = istemci('http://localhost:'+PORT, {transports:['websocket']});
  const olaylar = [];
  let sonTur = null, macSonucu = null;

  s.on('maç:kuruldu', v=>{ olaylar.push('maç:kuruldu'); });
  s.on('tur:başladı', v=>{ olaylar.push('tur:başladı'); sonTur = v; });
  s.on('tur:buzz', v=>olaylar.push('tur:buzz'));
  s.on('tur:bitti', v=>olaylar.push('tur:bitti:'+(v.kazanan?'kazanan':'boş')));
  s.on('maç:bitti', v=>{ macSonucu = v; });
  s.on('hata', h=>olaylar.push('hata:'+h));

  s.on('connect', ()=>s.emit('kuyruğa:gir', {ad:'İzzet', elo:1200, seviye:'normal'}));

  // İnsan oyuncu: her turda bir gecikmeyle buzz'a basıp doğru zinciri gönderir
  s.on('tur:başladı', v=>{
    const cozum = O.coz(v.sayilar, v.hedef, 400);
    const bekle = 2000 + Math.random()*2000;
    setTimeout(()=>{
      s.emit('mesafe', cozum.deger);
      s.emit('buzz');
      setTimeout(()=>s.emit('gönder', cozum.adimlar), 300);
    }, bekle);
  });

  const bitti = await new Promise(r=>{
    s.on('maç:bitti', v=>r(v));
    setTimeout(()=>r(null), 90000);
  });

  console.log('');
  kontrol('Rakip yokken bot devreye girdi', olaylar.includes('maç:kuruldu'));
  kontrol('5 tur oynandı', olaylar.filter(o=>o.startsWith('tur:başladı')).length===5,
          olaylar.filter(o=>o.startsWith('tur:başladı')).length+' tur');
  kontrol('Her tur kapandı', olaylar.filter(o=>o.startsWith('tur:bitti')).length===5);
  kontrol('Maç sonucu üretildi', !!bitti, bitti ? JSON.stringify(bitti.puanlar) : 'yok');
  kontrol('Rövanş için tohum döndü', !!(bitti && bitti.tohum));

  console.log('\nOlay akışı: ' + olaylar.slice(0,14).join(' → '));
  console.log('\n' + '─'.repeat(46));
  console.log(`SONUÇ: ${basarili} geçti, ${basarisiz} kaldı`);
  process.exit(basarisiz ? 1 : 0);
});
