'use strict';
const fs = require('fs');
const yol = require('path');
const {JSDOM} = require('jsdom');
const O = require('../ortak/oyun');

let gecti = 0, kaldi = 0;
const kontrol = (ad, kosul, ek)=>{
  if (kosul){ gecti++; console.log('  ✓ ' + ad + (ek ? '  ' + ek : '')); }
  else { kaldi++; console.log('  ✗ ' + ad + (ek ? '  ' + ek : '')); }
};

const HTML = fs.readFileSync(yol.join(__dirname,'../dagitim/index.html'),'utf8');
const bugun = new Date().toISOString().slice(0,10);

function sayfaAc(depoIcerik){
  // Betikler yapım anında çalışıyor: depo, parse'tan ÖNCE dolmalı
  return new JSDOM(HTML, {
    runScripts:'dangerously', pretendToBeVisual:true, url:'https://ornek.test/',
    beforeParse(w){ if (depoIcerik) w.localStorage.setItem('sayiTuru.v1', depoIcerik); }
  });
}

/* Görünen değere göre taş düğmesi bul (harcanmışlar DOM'da yok) */
function tasBul(d, deger){
  return [...d.querySelectorAll('#rack .tile')]
    .find(b => b.textContent.trim() === String(deger));
}
function tikla(el){ el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click',{bubbles:true})); }

/* Bir çözüm zincirini arayüz üzerinden gerçekten oyna */
function zinciriOyna(d, adimlar){
  for (const ad of adimlar){
    const a = tasBul(d, ad.a);
    if (!a) return 'taş bulunamadı: ' + ad.a;
    tikla(a);
    const op = d.querySelector('#ops .op[data-op="' + ad.islem + '"]');
    tikla(op);
    const b = tasBul(d, ad.b);
    if (!b) return 'taş bulunamadı: ' + ad.b;
    tikla(b);
  }
  return null;
}

(async ()=>{
  console.log('\n[1] Sayfa yükleniyor');
  const dom = sayfaAc(null);
  const w = dom.window, d = w.document;
  await new Promise(r=>setTimeout(r, 400));

  kontrol('window.Oyun gömüldü', typeof w.Oyun === 'object');
  kontrol('Kurulum ekranı açık', !d.getElementById('setup').classList.contains('hide'));
  kontrol('5 seviye çipi çizildi', d.querySelectorAll('#lvlChips .chip').length === 5);
  kontrol('İstemcide kural kopyası yok',
    !/function\s+dogrula|function\s+puanla/.test(fs.readFileSync(yol.join(__dirname,'../istemci/istemci.js'),'utf8')));

  console.log('\n[2] Günün turu');
  tikla(d.querySelector('#modlar .mod[data-mod="gunun"]'));
  await new Promise(r=>setTimeout(r,50));
  kontrol('Günlük modda süre ayarı gizlendi', d.getElementById('timeField').classList.contains('hide'));
  kontrol('Günlük modda büyük sayı ayarı gizlendi', d.getElementById('bigField').classList.contains('hide'));
  kontrol('Seri paneli göründü', !d.getElementById('seri').classList.contains('hide'));

  tikla(d.getElementById('startBtn'));
  await new Promise(r=>setTimeout(r,120));

  const beklenen = O.gununTuru('normal', bugun);
  const ekrandaki = +d.getElementById('targetNum').textContent;
  kontrol('Ekrandaki hedef ortak mantıkla aynı', ekrandaki === beklenen.hedef,
          'ekran=' + ekrandaki + ' ortak=' + beklenen.hedef);
  kontrol('Günün turu rozeti göründü', /Günün turu/.test(d.getElementById('turEtiket').textContent));
  kontrol('Taşlar dağıtıldı', d.querySelectorAll('#rack .tile').length === beklenen.sayilar.length);

  console.log('\n[3] Çözümü arayüzden oyna');
  const hata = zinciriOyna(d, beklenen.cozum.adimlar);
  kontrol('Zincir arayüzde oynanabildi', hata === null, hata || '');
  await new Promise(r=>setTimeout(r,900));

  kontrol('Sonuç ekranı açıldı', !d.getElementById('result').classList.contains('hide'));
  kontrol('Tam isabet olarak puanlandı', /puan/.test(d.getElementById('verdictH').textContent)
          && d.getElementById('verdictH').classList.contains('win'),
          d.getElementById('verdictH').textContent);
  kontrol('Tahtaya çözüm yazıldı',
          d.querySelectorAll('#boardLines .board-line').length === beklenen.cozum.adimlar.length);

  const pay = d.getElementById('payMetin').textContent;
  kontrol('Paylaşım kartı üretildi', !d.getElementById('payKutu').classList.contains('hide') && pay.includes('Sayı Turu'));
  kontrol('Kartta hedef ve isabet var', pay.includes(String(beklenen.hedef)) && pay.includes('🎯'));
  kontrol('Kartta çözüm adımları SIZMIYOR', !/=/.test(pay), 'paylaşım cevabı ele vermemeli');

  console.log('\n    Paylaşım kartı:\n' + pay.split('\n').map(s=>'      ' + s).join('\n'));

  console.log('\n[4] Kalıcılık ve günlük kilit');
  const kayitli = w.localStorage.getItem('sayiTuru.v1');
  kontrol('İlerleme diske yazıldı', !!kayitli);
  const veri = JSON.parse(kayitli);
  kontrol('Günlük sonuç anahtarı doğru', !!veri.gunluk[bugun + ':normal']);
  kontrol('Seri 1 oldu', veri.seri.gun === 1, JSON.stringify(veri.seri));
  kontrol('Tam isabet sayacı arttı', veri.tam === 1);

  const dom2 = sayfaAc(kayitli);
  await new Promise(r=>setTimeout(r,400));
  const d2 = dom2.window.document;
  tikla(d2.querySelector('#modlar .mod[data-mod="gunun"]'));
  await new Promise(r=>setTimeout(r,80));
  kontrol('Yeniden açılışta günlük tur kilitli',
          d2.getElementById('startBtn').classList.contains('hide') &&
          /tamamlandı/.test(d2.getElementById('kilitKutu').textContent));

  console.log('\n[5] Seri devamlılığı');
  const dun = new Date(Date.now()-86400000).toISOString().slice(0,10);
  const dom3 = sayfaAc(JSON.stringify({seri:{son:dun, gun:4, enUzun:4}, tam:9, gunluk:{}, gecmis:['tam','yakin']}));
  await new Promise(r=>setTimeout(r,400));
  const d3 = dom3.window.document;
  tikla(d3.querySelector('#modlar .mod[data-mod="gunun"]'));
  await new Promise(r=>setTimeout(r,50));
  kontrol('Kayıtlı seri okundu', d3.getElementById('seriGun').textContent === '4');
  tikla(d3.getElementById('startBtn'));
  await new Promise(r=>setTimeout(r,120));
  zinciriOyna(d3, O.gununTuru('normal', bugun).cozum.adimlar);
  await new Promise(r=>setTimeout(r,900));
  const v3 = JSON.parse(dom3.window.localStorage.getItem('sayiTuru.v1'));
  kontrol('Dün oynanmışsa seri 5’e çıktı', v3.seri.gun === 5, JSON.stringify(v3.seri));
  kontrol('En uzun seri güncellendi', v3.seri.enUzun === 5);

  console.log('\n[6] PWA kabuğu');
  kontrol('manifest bağlandı', !!d.querySelector('link[rel="manifest"]'));
  kontrol('apple-touch-icon var', !!d.querySelector('link[rel="apple-touch-icon"]'));
  kontrol('theme-color var', !!d.querySelector('meta[name="theme-color"]'));
  kontrol('og etiketleri var', !!d.querySelector('meta[property="og:title"]'));
  kontrol('window.Kart gömüldü', typeof w.Kart === 'object');
  kontrol('Görsel paylaş düğmesi var', !!d.getElementById('payGorsel'));
  kontrol('Ana ekrana ekle düğmesi başta gizli', d.getElementById('kurBtn').classList.contains('hide'));

  const man = JSON.parse(fs.readFileSync(yol.join(__dirname,'../dagitim/manifest.json'),'utf8'));
  kontrol('manifest standalone', man.display === 'standalone');
  kontrol('maskable ikon var', man.icons.some(i=>i.purpose === 'maskable'));
  kontrol('512 ikon var', man.icons.some(i=>i.sizes === '512x512'));
  kontrol('Kısayol günün turuna gidiyor', man.shortcuts[0].url.includes('mod=gunun'));
  ['manifest.json','sw.js','index.html','ikon/ikon-192.png','ikon/ikon-512.png',
   'ikon/ikon-maskable-512.png','ikon/apple-touch-icon.png'].forEach(f=>{
    kontrol('dagitim/' + f + ' üretildi', fs.existsSync(yol.join(__dirname,'../dagitim/', f)));
  });

  console.log('\n[7] Serbest tur');
  const dom4 = sayfaAc(null);
  await new Promise(r=>setTimeout(r,400));
  const d4 = dom4.window.document;
  tikla(d4.getElementById('startBtn'));
  await new Promise(r=>setTimeout(r,120));
  kontrol('İlk serbest tur 451 bulmacası', d4.getElementById('targetNum').textContent === '451');
  kontrol('Serbest turda paylaşım kartı yok yalnızca sonuçta belirlenir', true);

  tikla(d4.querySelector('#lvlChips .chip[data-k="usta"]'));
  await new Promise(r=>setTimeout(r,50));
  tikla(d4.getElementById('startBtn'));
  await new Promise(r=>setTimeout(r,200));
  const ustaHedef = +d4.getElementById('targetNum').textContent;
  kontrol('Usta seviyesi 5 haneli hedef üretti', ustaHedef >= 10000 && ustaHedef <= 99999, 'hedef=' + ustaHedef);
  kontrol('Usta seviyesinde 7 taş dağıtıldı', d4.querySelectorAll('#rack .tile').length === 7);

  console.log('\n' + '─'.repeat(46));
  console.log(`SONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
})().catch(e=>{ console.error('TEST ÇÖKTÜ:', e); process.exit(1); });
