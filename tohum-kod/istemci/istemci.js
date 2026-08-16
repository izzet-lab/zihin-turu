'use strict';
/* ============================================================
   İSTEMCİ
   Kural, üretim, doğrulama ve puanlama BURADA YOK. Hepsi
   ortak/oyun.js'te. Bu dosya sadece gösterim ve girdi yönetimi.
   Faz 2'de sunucu devreye girdiğinde aynı Oyun API'si orada
   çalışacağı için bu katman değişmeden kalır.
   ============================================================ */

const O = window.Oyun;
const $ = id => document.getElementById(id);
const press = (kutu, el) => [...$(kutu).children].forEach(c=>c.setAttribute('aria-pressed', c===el));
const bugun = () => new Date().toISOString().slice(0,10);

/* ---------- Kalıcılık ----------
   localStorage her ortamda yok (gömülü görüntüleyiciler engelleyebilir).
   Erişilemezse bellekte tutulur: oyun çalışmaya devam eder, sadece
   sayfa yenilenince ilerleme sıfırlanır. */
const depo = (function(){
  const ANAHTAR = 'sayiTuru.v1';
  let bellek = null, kalici = true;
  try {
    const d = window.localStorage.getItem(ANAHTAR);
    bellek = d ? JSON.parse(d) : null;
  } catch(e){ kalici = false; }
  if (!bellek) bellek = {seri:{son:null, gun:0, enUzun:0}, tam:0, gunluk:{}, gecmis:[]};
  return {
    kalici,
    oku(){ return bellek; },
    yaz(){
      if (!kalici) return;
      try { window.localStorage.setItem(ANAHTAR, JSON.stringify(bellek)); } catch(e){ kalici = false; }
    }
  };
})();

/* ---------- Durum ---------- */
const S = {
  mod:'serbest', seviye:'normal', buyukAdet:2, sure:45,
  tur:null, taslar:[], gecmis:[], secili:null, islem:null,
  enYakin:null, kalanSure:0, sayacId:null,
  puan:0, turNo:0, canli:false, ilkTur:true, baslangicAn:0
};

/* ---------- Kurulum arayüzü ---------- */
[...$('modlar').children].forEach(b=>{
  b.onclick = ()=>{ S.mod = b.dataset.mod; press('modlar', b); seviyeUygula(); };
});

Object.keys(O.SEVIYELER).forEach(anahtar=>{
  const L = O.SEVIYELER[anahtar], b = document.createElement('button');
  b.className='chip';
  b.innerHTML = L.etiket + '<small>' + L.hane + ' hane</small>';
  b.dataset.k = anahtar;
  b.setAttribute('aria-pressed', anahtar === S.seviye);
  b.onclick = ()=>{ S.seviye = anahtar; press('lvlChips', b); seviyeUygula(); };
  $('lvlChips').appendChild(b);
});
[0,1,2,3,4].forEach(n=>{
  const b=document.createElement('button');
  b.className='chip'; b.textContent=n; b.dataset.v=n;
  b.setAttribute('aria-pressed', n===2);
  b.onclick=()=>{ S.buyukAdet=n; press('bigChips', b); };
  $('bigChips').appendChild(b);
});
[[30,'30 sn'],[45,'45 sn'],[90,'90 sn'],[0,'Süresiz']].forEach(([v,etiket])=>{
  const b=document.createElement('button');
  b.className='chip'; b.textContent=etiket; b.dataset.v=v;
  b.setAttribute('aria-pressed', v===45);
  b.onclick=()=>{ S.sure=v; press('timeChips', b); };
  $('timeChips').appendChild(b);
});

const ACIKLAMA = {
  cocuk:  ['Dört sayı, iki haneli hedef.',
           'Küçük çocuklar için: 1–10 arası dört sayı, hedef 10 ile 99 arasında. Süre kapalı başlar, acele yok.'],
  kolay:  ['Beş sayı, hedef 500’e kadar.',
           '1–10 arası beş sayı. Toplama-çıkarma çoğu turda yetmez; çarpmayı kullanmayı öğreten seviye bu.'],
  normal: ['Altı sayı, üç haneli hedef.',
           'Yarışmadaki tur: küçük/büyük sayı karışımı, hedef 101–999. İlk serbest turun o meşhur el: <b>451</b>.'],
  zor:    ['Altı sayı, dört haneli hedef.',
           'Binlerin üstüne çıkmak için çarpma zinciri kurman gerekiyor. Tek bir bölme tüm zinciri kurtarabilir.'],
  usta:   ['Yedi sayı, beş haneli hedef.',
           'On binler. Yedi taşın neredeyse hepsini kullanman gerekir; süre kapalı başlar, bu seviye hız değil sabır işi.']
};

function seviyeUygula(){
  const L = O.SEVIYELER[S.seviye];
  const gunlukMod = S.mod === 'gunun';

  $('setupH').textContent = ACIKLAMA[S.seviye][0];
  $('setupP').innerHTML   = ACIKLAMA[S.seviye][1];

  // Günlük turda ayar yok: herkesin aynı koşulda oynaması şart
  $('bigField').classList.toggle('hide', gunlukMod || !L.buyukVar);
  $('timeField').classList.toggle('hide', gunlukMod);

  S.sure = L.sure;
  S.buyukAdet = L.buyukVar ? 2 : 0;
  const t = [...$('timeChips').children].find(c=>+c.dataset.v === L.sure);
  if (t) press('timeChips', t);
  const g = [...$('bigChips').children].find(c=>+c.dataset.v === S.buyukAdet);
  if (g) press('bigChips', g);

  S.ilkTur = (S.seviye === 'normal' && S.turNo === 0 && !gunlukMod);
  kilitGoster();
  seriGoster();
}

/* ---------- Günlük kilit ----------
   Günün turu günde bir kez oynanır. Bu kısıt olmadan "herkese aynı
   bulmaca" fikri anlamını kaybeder. */
function gunlukAnahtar(){ return bugun() + ':' + S.seviye; }
function gunlukSonuc(){ return depo.oku().gunluk[gunlukAnahtar()] || null; }

function kilitGoster(){
  const kutu = $('kilitKutu');
  kutu.innerHTML = '';
  const oynandi = S.mod === 'gunun' && gunlukSonuc();
  $('startBtn').classList.toggle('hide', !!oynandi);
  if (!oynandi) return;
  const r = oynandi;
  kutu.innerHTML =
    '<div class="kilit"><b>Bugünün turu tamamlandı</b>' +
    (r.fark === 0 ? 'Tam isabet' : r.ulasilan + ' ile ' + r.fark + ' fark') +
    ' · ' + r.puan + ' puan<br>Yarın yeni bir tur gelir.</div>';
  const b = document.createElement('button');
  b.className = 'btn primary'; b.style.width = '100%'; b.style.marginTop = '12px';
  b.textContent = 'Sonucu tekrar göster';
  b.onclick = ()=> sonucGoster(r, true);
  kutu.appendChild(b);
}

function seriGoster(){
  const d = depo.oku();
  $('seriGun').textContent = d.seri.gun;
  $('seriEnUzun').textContent = d.seri.enUzun;
  $('seriTam').textContent = d.tam;
  $('seri').classList.toggle('hide', S.mod !== 'gunun');

  const cizgi = $('gecmisCizgi');
  cizgi.innerHTML = '';
  if (S.mod !== 'gunun') return;
  d.gecmis.slice(-28).forEach(k=>{
    const n = document.createElement('span');
    n.className = 'gecmis-nokta ' + k;
    cizgi.appendChild(n);
  });
}

/* ---------- Tur başlatma ---------- */
function turBaslat(){
  const L = O.SEVIYELER[S.seviye];

  if (S.mod === 'gunun'){
    if (gunlukSonuc()) return;
    S.tur = O.gununTuru(S.seviye, bugun());
    S.sure = L.sure;
  } else if (S.ilkTur){
    S.tur = {seviye:'normal', hedef:451, sayilar:[7,4,5,2,2,75],
             cozum:O.coz([7,4,5,2,2,75], 451)};
    S.ilkTur = false;
  } else {
    S.tur = O.turUret(S.seviye, {buyukAdet:S.buyukAdet});
  }

  S.taslar = O.karistir(S.tur.sayilar, Math.random)
    .map((d,i)=>({id:i, d, harcandi:false, uretilen:false, yeni:true}));
  S.gecmis = []; S.secili = null; S.islem = null; S.enYakin = null;
  S.turNo++; S.canli = true; S.baslangicAn = Date.now();

  $('setup').classList.add('hide');
  $('result').classList.add('hide');
  $('game').classList.remove('hide');
  $('turEtiket').innerHTML = S.mod === 'gunun'
    ? '<span class="gunluk-rozet">Günün turu · ' + O.SEVIYELER[S.seviye].etiket + '</span>'
    : 'Hedef';
  $('targetNum').textContent = S.tur.hedef;
  $('targetNum').style.fontSize = S.tur.hedef > 9999 ? 'clamp(36px,11.5vw,54px)'
                                : S.tur.hedef > 999  ? 'clamp(42px,13.5vw,62px)' : '';
  $('round').textContent = S.turNo;
  $('msg').textContent = '';
  ciz();
  sayacBaslat();
}

/* ---------- Çizim ---------- */
function ciz(){
  const raf = $('rack'); raf.innerHTML = '';
  const n = O.SEVIYELER[S.seviye].tas;
  raf.style.setProperty('--tile-w', 'calc((100% - ' + ((n-1)*7) + 'px) / ' + n + ')');

  S.taslar.forEach((t, i)=>{
    if (t.harcandi) return;
    const b = document.createElement('button');
    b.className = 'tile' + (t.uretilen ? ' made' : '') + (S.secili === t.id ? ' sel' : '') +
                  (t.yeni ? (t.uretilen ? ' pop' : ' deal') : '');
    if (t.yeni && !t.uretilen) b.style.animationDelay = (i*55) + 'ms';
    b.innerHTML = '<span class="tile-in">' + t.d + '</span>';
    b.setAttribute('aria-label', t.d + (S.secili === t.id ? ', seçili' : ''));
    b.onclick = ()=>tasSec(t.id);
    raf.appendChild(b);
  });
  S.taslar.forEach(t=>t.yeni = false);

  [...$('ops').children].forEach(o=>{
    o.classList.toggle('sel', S.islem === o.dataset.op);
    o.disabled = S.secili === null;
  });

  const kayit = $('log'); kayit.innerHTML = '';
  S.gecmis.forEach(h=>{
    const d = document.createElement('div'); d.className = 'log-row';
    d.innerHTML = '<span>' + h.a + ' ' + h.islem + ' ' + h.b + '</span><b>' + h.sonuc + '</b>';
    kayit.appendChild(d);
  });

  $('undoBtn').disabled = !S.gecmis.length || !S.canli;
  $('clearBtn').disabled = !S.gecmis.length || !S.canli;

  const dl = $('diffLabel');
  if (S.enYakin === null){ dl.innerHTML = 'En yakın <b>—</b>'; dl.classList.remove('diff-ok'); }
  else {
    const f = Math.abs(S.enYakin - S.tur.hedef);
    dl.innerHTML = 'En yakın <b>' + S.enYakin + '</b> (' + (f === 0 ? 'tam' : '±' + f) + ')';
    dl.classList.toggle('diff-ok', f === 0);
  }
}

/* ---------- Oynayış ---------- */
function tasSec(id){
  if (!S.canli) return;
  const t = S.taslar.find(x=>x.id === id);
  if (!t || t.harcandi) return;

  if (S.secili === null){ S.secili = id; S.islem = null; $('msg').textContent = ''; return ciz(); }
  if (S.secili === id){ S.secili = null; S.islem = null; return ciz(); }
  if (S.islem === null){ S.secili = id; return ciz(); }

  const a = S.taslar.find(x=>x.id === S.secili);
  const sonuc = O.uygula(a.d, t.d, S.islem);           // kural ortak dosyadan
  if (sonuc === null){
    $('msg').className = 'msg';
    $('msg').textContent = S.islem === '÷'
      ? a.d + ' ÷ ' + t.d + ' tam bölünmüyor.'
      : a.d + ' − ' + t.d + ' pozitif değil.';
    return;
  }

  a.harcandi = true; t.harcandi = true;
  const yeniId = Math.max(...S.taslar.map(x=>x.id)) + 1;
  S.taslar.push({id:yeniId, d:sonuc, harcandi:false, uretilen:true, yeni:true});
  S.gecmis.push({a:a.d, b:t.d, islem:S.islem, sonuc, aId:a.id, bId:t.id, yeniId});

  if (S.enYakin === null || Math.abs(sonuc - S.tur.hedef) < Math.abs(S.enYakin - S.tur.hedef))
    S.enYakin = sonuc;
  S.secili = null; S.islem = null; $('msg').textContent = '';
  ciz();

  if (sonuc === S.tur.hedef){
    $('msg').className = 'msg good'; $('msg').textContent = 'Tam isabet.';
    setTimeout(()=>turBitir(), 650);
  } else if (S.taslar.filter(x=>!x.harcandi).length === 1){
    setTimeout(()=>turBitir(), 450);
  }
}

function islemSec(islem){
  if (!S.canli || S.secili === null) return;
  S.islem = (S.islem === islem ? null : islem);
  ciz();
}

function geriAl(){
  if (!S.canli || !S.gecmis.length) return;
  const h = S.gecmis.pop();
  S.taslar = S.taslar.filter(t=>t.id !== h.yeniId);
  S.taslar.find(t=>t.id === h.aId).harcandi = false;
  S.taslar.find(t=>t.id === h.bId).harcandi = false;
  S.secili = null; S.islem = null; S.enYakin = null;
  S.gecmis.forEach(x=>{
    if (S.enYakin === null || Math.abs(x.sonuc - S.tur.hedef) < Math.abs(S.enYakin - S.tur.hedef))
      S.enYakin = x.sonuc;
  });
  $('msg').textContent = '';
  ciz();
}

/* ---------- Süre ---------- */
function sayacBaslat(){
  clearInterval(S.sayacId);
  if (!S.sure){
    $('timerFill').style.width = '100%';
    $('timerFill').className = 'timer-fill';
    $('timeLabel').innerHTML = 'Süre <b>∞</b>';
    return;
  }
  S.kalanSure = S.sure;
  sayacCiz();
  S.sayacId = setInterval(()=>{
    S.kalanSure--; sayacCiz();
    if (S.kalanSure <= 0){ clearInterval(S.sayacId); turBitir(); }
  }, 1000);
}
function sayacCiz(){
  const f = $('timerFill'), y = S.kalanSure / S.sure * 100;
  f.style.width = Math.max(0, y) + '%';
  f.className = 'timer-fill' + (S.kalanSure <= 5 ? ' crit' : (S.kalanSure <= 15 ? ' warn' : ''));
  $('timeLabel').innerHTML = 'Süre <b>' + Math.max(0, S.kalanSure) + '</b>';
}

/* ---------- Tur sonu ---------- */
function turBitir(){
  if (!S.canli) return;
  S.canli = false;
  clearInterval(S.sayacId);

  const gecen = Math.round((Date.now() - S.baslangicAn) / 1000);
  const kalan = S.sure ? Math.max(0, S.sure - gecen) : 0;
  const fark = S.enYakin === null ? Infinity : Math.abs(S.enYakin - S.tur.hedef);

  // Puanlama ortak dosyada; istemci sadece sonucu gösterir
  const p = fark === Infinity
    ? {taban:0, hiz:0, buzzer:0, toplam:0}
    : O.puanla(S.seviye, fark, kalan, S.sure || gecen, false);

  S.puan += p.toplam;
  $('score').textContent = S.puan;

  const kayit = {
    seviye:S.seviye, hedef:S.tur.hedef, ulasilan:S.enYakin,
    fark, puan:p.toplam, sure:gecen, adim:S.gecmis.length,
    cozum:S.tur.cozum.adimlar, gunluk:S.mod === 'gunun', tarih:bugun()
  };

  if (S.mod === 'gunun') gunlukKaydet(kayit);
  sonucGoster(kayit, false);
}

function gunlukKaydet(k){
  const d = depo.oku();
  d.gunluk[gunlukAnahtar()] = k;

  // Seri: dün oynadıysa devam, oynamadıysa baştan
  const dun = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  d.seri.gun = (d.seri.son === dun) ? d.seri.gun + 1 : (d.seri.son === k.tarih ? d.seri.gun : 1);
  d.seri.son = k.tarih;
  d.seri.enUzun = Math.max(d.seri.enUzun, d.seri.gun);
  if (k.fark === 0) d.tam++;

  const tol = O.SEVIYELER[k.seviye].tolerans;
  d.gecmis.push(k.fark === 0 ? 'tam' : k.fark <= tol[1] ? 'yakin' : 'uzak');
  if (d.gecmis.length > 60) d.gecmis = d.gecmis.slice(-60);
  depo.yaz();
}

function sonucGoster(k, tekrar){
  sonKayit = k;
  const tol = O.SEVIYELER[k.seviye].tolerans;
  let tur = 'miss', baslik, alt;
  if (k.fark === 0){ tur = 'win'; baslik = k.puan + ' puan'; alt = 'Hedefi tam tutturdun.'; }
  else if (k.fark <= tol[0]){ tur = 'near'; baslik = k.puan + ' puan'; alt = k.ulasilan + ' ile ' + k.fark + ' fark bıraktın.'; }
  else if (k.fark <= tol[1]){ tur = 'near'; baslik = k.puan + ' puan'; alt = k.ulasilan + ' ile ' + k.fark + ' fark bıraktın.'; }
  else { baslik = 'Puan yok'; alt = k.ulasilan == null ? 'Hiç işlem yapmadın.'
        : 'En yakın ' + k.ulasilan + ', hedeften ' + k.fark + ' uzakta.'; }

  const vh = $('verdictH'); vh.className = 'verdict-h ' + tur; vh.textContent = baslik;
  $('verdictP').textContent = alt;

  const satirlar = $('boardLines'); satirlar.innerHTML = '';
  (k.cozum || []).forEach((s, i)=>{
    const el = document.createElement('div');
    el.className = 'board-line' + (i === k.cozum.length-1 ? ' final' : '');
    el.textContent = s.a + ' ' + s.islem + ' ' + s.b + ' = ' + s.sonuc;
    satirlar.appendChild(el);
    setTimeout(()=>el.classList.add('in'), tekrar ? 0 : 180 + i*260);
  });

  // Paylaşım kartı yalnızca günün turunda: paylaşılan şey ortak bulmaca
  $('payOnizleme').classList.add('hide');
  $('payOnizleme').innerHTML = '';
  $('payKutu').classList.toggle('hide', !k.gunluk);
  if (k.gunluk){
    $('payMetin').textContent = payMetni(k);
    $('payNot').textContent = depo.kalici
      ? 'Bugün herkes aynı turu oynuyor.'
      : 'Bu ortamda ilerleme kaydedilemiyor — sayfa yenilenince sıfırlanır.';
  }

  $('nextBtn').textContent = k.gunluk ? 'Serbest tur oyna' : 'Yeni tur';
  $('game').classList.add('hide');
  $('result').classList.remove('hide');
}

function payMetni(k){
  const d = depo.oku();
  const [yil, ay, gun] = k.tarih.split('-');
  const isaret = k.fark === 0 ? '🎯' : k.fark <= O.SEVIYELER[k.seviye].tolerans[1] ? '🟡' : '⬜';
  const satir = [];
  satir.push('Sayı Turu · ' + gun + '.' + ay + ' · ' + O.SEVIYELER[k.seviye].etiket);
  satir.push(isaret + ' ' + k.hedef + ' → ' + (k.ulasilan == null ? '—' : k.ulasilan) +
             (k.fark === 0 ? '' : ' (' + k.fark + ' fark)'));
  satir.push(k.adim + ' adım · ' + k.sure + ' sn · ' + k.puan + ' puan');
  if (d.seri.gun > 1) satir.push('🔥 ' + d.seri.gun + ' günlük seri');
  return satir.join('\n');
}

/* ---------- Bağlama ---------- */
$('startBtn').onclick = turBaslat;
$('nextBtn').onclick = ()=>{
  if (S.mod === 'gunun'){
    S.mod = 'serbest';
    press('modlar', [...$('modlar').children].find(b=>b.dataset.mod === 'serbest'));
    seviyeUygula();
  }
  turBaslat();
};
$('setupBtn').onclick = ()=>{
  $('result').classList.add('hide');
  $('setup').classList.remove('hide');
  kilitGoster(); seriGoster();
};
$('undoBtn').onclick = geriAl;
$('clearBtn').onclick = ()=>{ while (S.gecmis.length) geriAl(); };
$('giveUpBtn').onclick = ()=>turBitir();
[...$('ops').children].forEach(o=> o.onclick = ()=>islemSec(o.dataset.op));

/* ---------- Paylaşım ---------- */
let sonKayit = null;

$('payBtn').onclick = async ()=>{
  const metin = $('payMetin').textContent;
  try {
    await navigator.clipboard.writeText(metin);
    $('payBtn').textContent = 'Kopyalandı';
  } catch(e){
    // Pano izni yoksa kullanıcı metni elle seçebilsin
    const s = window.getSelection(), r = document.createRange();
    r.selectNodeContents($('payMetin')); s.removeAllRanges(); s.addRange(r);
    $('payBtn').textContent = 'Seçtim, kopyala';
  }
  setTimeout(()=>$('payBtn').textContent = 'Metni kopyala', 2200);
};

$('payGorsel').onclick = async ()=>{
  if (!sonKayit || !window.Kart) return;
  const d = depo.oku();
  $('payGorsel').disabled = true;
  $('payGorsel').textContent = 'Görsel hazırlanıyor…';
  try {
    const sonuc = await window.Kart.paylas(
      sonKayit,
      O.SEVIYELER[sonKayit.seviye].etiket,
      O.SEVIYELER[sonKayit.seviye].tolerans,
      d.seri.gun,
      $('payMetin').textContent,
      $('payOnizleme')
    );
    // Görsel artık sayfada; düğme yeniden üretmek için duruyor
    $('payGorsel').textContent =
      sonuc === 'paylasildi' ? 'Paylaşıldı' : 'Görsel hazır';
  } catch(e){
    $('payGorsel').textContent = 'Görsel oluşturulamadı';
  }
  $('payGorsel').disabled = false;
  setTimeout(()=>$('payGorsel').textContent = 'Görseli paylaş', 2600);
  $('payOnizleme').scrollIntoView({behavior:'smooth', block:'nearest'});
};

/* ---------- PWA ----------
   Oyun tamamen istemcide çalıştığı için çevrimdışı da tam çalışır.
   Servis çalışanı yalnızca sunucudan servis edilirken kaydolur;
   dosya olarak açıldığında sessizce atlanır. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

let kurulumIstemi = null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  kurulumIstemi = e;
  $('kurBtn').classList.remove('hide');
});
$('kurBtn').onclick = async ()=>{
  if (!kurulumIstemi) return;
  kurulumIstemi.prompt();
  await kurulumIstemi.userChoice;
  kurulumIstemi = null;
  $('kurBtn').classList.add('hide');
};
window.addEventListener('appinstalled', ()=>$('kurBtn').classList.add('hide'));

/* Kısayoldan gelindiyse doğrudan günün turuna geç */
if (new URLSearchParams(location.search).get('mod') === 'gunun'){
  S.mod = 'gunun';
  press('modlar', [...$('modlar').children].find(b=>b.dataset.mod === 'gunun'));
}

document.addEventListener('keydown', e=>{
  if (!S.canli) return;
  const harita = {'+':'+','-':'−','*':'×','x':'×','X':'×','/':'÷',':':'÷'};
  if (harita[e.key]){ e.preventDefault(); return islemSec(harita[e.key]); }
  if (e.key === 'Backspace'){ e.preventDefault(); return geriAl(); }
  if (/^[1-9]$/.test(e.key)){
    const acik = S.taslar.filter(t=>!t.harcandi);
    const t = acik[+e.key - 1];
    if (t){ e.preventDefault(); tasSec(t.id); }
  }
});

seviyeUygula();
