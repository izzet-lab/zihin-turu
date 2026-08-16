'use strict';
/* ============================================================
   GÖRSEL PAYLAŞIM KARTI
   Metin kart okunur ama tıklanmaz. WhatsApp ve Instagram'da
   dolaşan şey görsel. Bu dosya sonucu 1080×1080 bir tuvale çizip
   paylaşılabilir bir dosya üretir.

   Tek kural: ÇÖZÜM ADIMLARI KARTA GİRMEZ. Kartı gören kişi
   bulmacayı henüz oynamamış olabilir.
   ============================================================ */

(function(){

const B = 1080;                      // kare kart: her platformda kırpılmaz
const RENK = {
  zemin:'#050F13', studio:'#112B35', dip:'#071219',
  cerceve:'#A8BFC6', cerceveSonuk:'#5C7480',
  tasUst:'#1E7B92', tasAlt:'#0C4A5C',
  rakam:'#7CEDFB', metin:'#CFE2E8', silik:'#6E8C97',
  ok:'#5AD9A0', amber:'#F0B33C', kotu:'#E8695B'
};

function yuvarlakDikdortgen(c, x, y, g, y2, r){
  c.beginPath();
  c.moveTo(x+r, y);
  c.arcTo(x+g, y,    x+g, y+y2, r);
  c.arcTo(x+g, y+y2, x,    y+y2, r);
  c.arcTo(x,   y+y2, x,    y,    r);
  c.arcTo(x,   y,    x+g,  y,    r);
  c.closePath();
}

function yaziOrtala(c, metin, x, y, font, renk){
  c.font = font; c.fillStyle = renk;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(metin, x, y);
}

/* Kartı çizer. kayit: turBitir'in ürettiği sonuç nesnesi. */
function ciz(tuval, kayit, seviyeEtiket, tolerans, seriGun){
  const c = tuval.getContext('2d');
  tuval.width = B; tuval.height = B;

  // ---- zemin: stüdyo ışığı
  const zemin = c.createRadialGradient(B/2, 0, 0, B/2, B*0.2, B*1.1);
  zemin.addColorStop(0, RENK.studio);
  zemin.addColorStop(0.55, '#0C1D25');
  zemin.addColorStop(1, RENK.dip);
  c.fillStyle = zemin; c.fillRect(0,0,B,B);

  // ---- CRT tarama çizgileri
  c.fillStyle = 'rgba(255,255,255,0.028)';
  for (let y=0; y<B; y+=4) c.fillRect(0, y, B, 1);

  // ---- üst şerit
  yaziOrtala(c, 'SAYI TURU', B/2, 108, '900 34px Chivo, sans-serif', RENK.cerceveSonuk);
  c.save(); c.letterSpacing = '10px';
  yaziOrtala(c, 'SAYI TURU', B/2, 108, '900 34px Chivo, sans-serif', RENK.cerceveSonuk);
  c.restore();

  const [yil, ay, gun] = kayit.tarih.split('-');
  yaziOrtala(c, gun + '.' + ay + '  ·  ' + seviyeEtiket + (kayit.gunluk ? '  ·  GÜNÜN TURU' : ''),
             B/2, 158, '700 27px Chivo, sans-serif', RENK.silik);

  // ---- hedef taşı
  const tg = 700, ty = 210, th = 250;
  const tx = (B - tg)/2;
  c.save();
  c.shadowColor = 'rgba(124,237,251,0.20)'; c.shadowBlur = 60;
  yuvarlakDikdortgen(c, tx, ty, tg, th, 20);
  c.fillStyle = RENK.cerceve; c.fill();
  c.restore();

  yuvarlakDikdortgen(c, tx+10, ty+10, tg-20, th-20, 14);
  const tasGecis = c.createLinearGradient(0, ty, 0, ty+th);
  tasGecis.addColorStop(0, RENK.tasUst); tasGecis.addColorStop(1, RENK.tasAlt);
  c.fillStyle = tasGecis; c.fill();

  yaziOrtala(c, 'HEDEF', B/2, ty+52, '700 22px Chivo, sans-serif', 'rgba(255,255,255,0.5)');
  const hedefMetin = String(kayit.hedef);
  let p = 150;
  c.font = '600 ' + p + 'px Fredoka, sans-serif';
  while (c.measureText(hedefMetin).width > tg-120 && p > 60){
    p -= 6; c.font = '600 ' + p + 'px Fredoka, sans-serif';
  }
  yaziOrtala(c, hedefMetin, B/2, ty+152, '600 ' + p + 'px Fredoka, sans-serif', RENK.rakam);

  // ---- sonuç satırı
  const tam = kayit.fark === 0;
  const yakin = !tam && kayit.fark <= tolerans[1];
  const durumRenk = tam ? RENK.ok : yakin ? RENK.amber : RENK.kotu;
  const durumMetin = tam ? 'TAM İSABET'
                    : kayit.ulasilan == null ? 'SONUÇ YOK'
                    : kayit.ulasilan + '  ·  ' + kayit.fark + ' FARK';

  c.save(); c.letterSpacing = '4px';
  yaziOrtala(c, durumMetin, B/2, 560, '900 52px Chivo, sans-serif', durumRenk);
  c.restore();

  // ---- istatistik kutuları
  const kutular = [
    [String(kayit.adim), 'ADIM'],
    [kayit.sure + ' sn', 'SÜRE'],
    [String(kayit.puan), 'PUAN']
  ];
  const kg = 250, kb = 150, aralik = 24;
  const toplam = kutular.length*kg + (kutular.length-1)*aralik;
  let kx = (B - toplam)/2;
  const ky = 650;
  kutular.forEach(([deger, etiket])=>{
    yuvarlakDikdortgen(c, kx, ky, kg, kb, 16);
    c.fillStyle = 'rgba(18,48,59,0.75)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = '#1D3D49'; c.stroke();
    yaziOrtala(c, deger, kx+kg/2, ky+58, '600 54px Fredoka, sans-serif', RENK.rakam);
    c.save(); c.letterSpacing = '5px';
    yaziOrtala(c, etiket, kx+kg/2, ky+112, '700 20px Chivo, sans-serif', RENK.silik);
    c.restore();
    kx += kg + aralik;
  });

  // ---- seri
  if (seriGun > 1)
    yaziOrtala(c, '🔥 ' + seriGun + ' günlük seri', B/2, 880, '700 34px Chivo, sans-serif', RENK.amber);

  // ---- alt bilgi
  c.save(); c.letterSpacing = '6px';
  yaziOrtala(c, kayit.gunluk ? 'BUGÜN HERKES AYNI TURU OYNUYOR' : 'SERBEST TUR',
             B/2, 975, '700 22px Chivo, sans-serif', RENK.cerceveSonuk);
  c.restore();

  return tuval;
}

/* Yazı tipleri yüklenmeden çizersek yedek fontla çıkar; bekliyoruz. */
async function uret(kayit, seviyeEtiket, tolerans, seriGun){
  if (document.fonts && document.fonts.ready){
    try { await document.fonts.ready; } catch(e){}
  }
  const tuval = document.createElement('canvas');
  ciz(tuval, kayit, seviyeEtiket, tolerans, seriGun);
  return new Promise(coz=>{
    if (tuval.toBlob) tuval.toBlob(b=>coz({tuval, blob:b}), 'image/png');
    else coz({tuval, blob:null});
  });
}

/* Akış: önce görseli sayfaya bas, sonra paylaşımı DENE.
   Otomatik indirme yok — kullanıcı "paylaş" derken indirme kutusuyla
   karşılaşmamalı. İndirme ayrı ve bilinçli bir eylem olarak sunulur.
   Zaten mobilde en doğal kaydetme yolu görsele basılı tutmak. */
async function paylas(kayit, seviyeEtiket, tolerans, seriGun, metin, onizlemeKutu){
  const {tuval, blob} = await uret(kayit, seviyeEtiket, tolerans, seriGun);
  const dosyaAdi = 'sayi-turu-' + kayit.tarih + '.png';

  if (onizlemeKutu){
    onizlemeKutu.innerHTML = '';
    const img = document.createElement('img');
    img.src = tuval.toDataURL('image/png');
    img.alt = 'Sayı Turu sonucu';
    img.className = 'pay-gorsel';
    onizlemeKutu.appendChild(img);

    const not = document.createElement('p');
    not.className = 'pay-ipucu';
    not.textContent = 'Görsele basılı tutup kaydedebilir veya paylaşabilirsin.';
    onizlemeKutu.appendChild(not);

    if (blob){
      const indir = document.createElement('a');
      indir.className = 'btn';
      indir.style.cssText = 'width:100%;display:block;text-align:center;text-decoration:none;margin-top:8px';
      indir.textContent = 'Görseli indir';
      indir.href = URL.createObjectURL(blob);
      indir.download = dosyaAdi;
      onizlemeKutu.appendChild(indir);
    }
    onizlemeKutu.classList.remove('hide');
  }

  if (blob && navigator.canShare){
    const dosya = new File([blob], dosyaAdi, {type:'image/png'});
    if (navigator.canShare({files:[dosya]})){
      try { await navigator.share({files:[dosya], text:metin}); return 'paylasildi'; }
      catch(e){ if (e && e.name === 'AbortError') return 'iptal'; }
    }
  }
  return 'gosterildi';
}

window.Kart = {ciz, uret, paylas, BOYUT:B};

})();
