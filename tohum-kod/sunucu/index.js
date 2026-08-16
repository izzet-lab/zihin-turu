'use strict';
/* ============================================================
   SUNUCU
   Sorumluluğu: eşleştirme, oda yaşam döngüsü, zaman aşımı,
   doğrulama. İstemci hiçbir şeyin doğruluğuna karar vermez.
   ============================================================ */

const http = require('http');
const express = require('express');
const {Server} = require('socket.io');
const O = require('../ortak/oyun');
const {Duello, TUR_SANIYE, BUZZ_SANIYE} = require('./duello');
const {botUret, botPlani} = require('./bot');

const PORT = process.env.PORT || 3000;
const BOT_BEKLEME_MS = 8000;      // bu süre sonunda rakip yoksa bot gelir

const app = express();
app.use(express.json());
const sunucu = http.createServer(app);
const io = new Server(sunucu, {cors:{origin:'*'}});

const kuyruk = [];                 // {soket, oyuncu, elo, seviye, zamanlayici}
const odalar = new Map();          // odaId -> {duello, zamanlayicilar, soketler}

/* ---------- REST: günün turu (üyeliksiz, paylaşılabilir) ---------- */
app.get('/api/gunun-turu/:seviye', (req,res)=>{
  const tur = O.gununTuru(req.params.seviye);
  res.json({seviye:tur.seviye, hedef:tur.hedef, sayilar:tur.sayilar, tohum:tur.tohum});
  // Dikkat: cozum gönderilmiyor.
});

app.post('/api/gunun-turu/:seviye/dogrula', (req,res)=>{
  const tur = O.gununTuru(req.params.seviye);
  const d = O.dogrula(tur.sayilar, req.body.adimlar || [], tur.hedef);
  if (!d.gecerli) return res.json({gecerli:false, hata:d.hata});
  const p = O.puanla(tur.seviye, d.fark, req.body.kalanSaniye|0, TUR_SANIYE, false);
  res.json({gecerli:true, fark:d.fark, puan:p, cozum:tur.cozum.adimlar});
});

app.get('/saglik', (_,res)=>res.json({ok:true, kuyruk:kuyruk.length, oda:odalar.size}));

/* ---------- Eşleştirme ---------- */
function eslestir(giren){
  const eş = kuyruk.findIndex(k => k.seviye===giren.seviye && Math.abs(k.elo-giren.elo) < 400);
  if (eş >= 0){
    const rakip = kuyruk.splice(eş,1)[0];
    clearTimeout(rakip.zamanlayici);
    return odaAc([rakip, giren], giren.seviye);
  }
  kuyruk.push(giren);
  giren.zamanlayici = setTimeout(()=>{
    const i = kuyruk.indexOf(giren);
    if (i < 0) return;
    kuyruk.splice(i,1);
    odaAc([giren, {oyuncu:botUret(giren.elo), soket:null}], giren.seviye);
  }, BOT_BEKLEME_MS);
}

function odaAc(katilimcilar, seviye){
  const odaId = 'oda:' + Math.random().toString(36).slice(2,10);
  const oyuncular = katilimcilar.map(k=>k.oyuncu);
  const duello = new Duello(odaId, oyuncular, {seviye});
  const kayit = {duello, katilimcilar, zamanlayicilar:[], odaId};
  odalar.set(odaId, kayit);

  katilimcilar.forEach(k=>{
    if (k.soket){
      k.soket.join(odaId);
      k.soket.data.odaId = odaId;
      k.soket.data.oyuncuId = k.oyuncu.id;
    }
  });
  io.to(odaId).emit('maç:kuruldu', {odaId, oyuncular, seviye});
  setTimeout(()=>siradakiTur(kayit), 1500);
  return kayit;
}

function temizle(kayit){
  kayit.zamanlayicilar.forEach(clearTimeout);
  kayit.zamanlayicilar = [];
}

function siradakiTur(kayit){
  temizle(kayit);
  const paket = kayit.duello.turBaslat();
  if (!paket) return macBitir(kayit);
  io.to(kayit.odaId).emit('tur:başladı', paket);

  kayit.zamanlayicilar.push(setTimeout(()=>{
    const s = kayit.duello.turZamanAsimi();
    if (s){ io.to(kayit.odaId).emit('tur:bitti', s); setTimeout(()=>siradakiTur(kayit), 2500); }
  }, TUR_SANIYE*1000));

  // Bot varsa planını kurar
  kayit.katilimcilar.filter(k=>k.oyuncu.bot).forEach(k=>{
    const plan = botPlani(k.oyuncu, kayit.duello.tur);
    kayit.zamanlayicilar.push(setTimeout(()=>{
      if (!plan.adimlar) return;
      const b = kayit.duello.buzz(k.oyuncu.id);
      if (!b.ok) return;
      io.to(kayit.odaId).emit('tur:buzz', {oyuncuId:k.oyuncu.id, saniye:BUZZ_SANIYE});
      kayit.zamanlayicilar.push(setTimeout(()=>{
        const s = kayit.duello.gonder(k.oyuncu.id, plan.adimlar);
        yayinla(kayit, k.oyuncu.id, s);
      }, 900 + Math.random()*1600));
    }, plan.gecikmeMs));
  });
}

function yayinla(kayit, oyuncuId, sonuc){
  if (sonuc.ok){
    io.to(kayit.odaId).emit('tur:bitti', sonuc);
    setTimeout(()=>siradakiTur(kayit), 2500);
  } else if (sonuc.turBitti){
    io.to(kayit.odaId).emit('tur:bitti', sonuc);
    setTimeout(()=>siradakiTur(kayit), 2500);
  } else {
    io.to(kayit.odaId).emit('tur:sıra-geçti', {kaybeden:oyuncuId, sebep:sonuc.sebep, yeniSira:sonuc.siraGecti});
  }
}

function macBitir(kayit){
  temizle(kayit);
  const s = kayit.duello.sonuc();
  io.to(kayit.odaId).emit('maç:bitti', s);
  odalar.delete(kayit.odaId);
  // TODO (Faz 3): ELO güncelle, lig tablosuna yaz, XP/rozet dağıt
}

/* ---------- Soket olayları ---------- */
io.on('connection', soket=>{

  soket.on('kuyruğa:gir', veri=>{
    const oyuncu = {
      id: soket.id,
      ad: (veri && veri.ad) || 'Misafir',
      bot: false
    };
    eslestir({soket, oyuncu, elo:(veri && veri.elo)||1200, seviye:(veri && veri.seviye)||'normal'});
    soket.emit('kuyruk:beklemede', {saniye: BOT_BEKLEME_MS/1000});
  });

  soket.on('buzz', ()=>{
    const kayit = odalar.get(soket.data.odaId); if (!kayit) return;
    const b = kayit.duello.buzz(soket.data.oyuncuId);
    if (!b.ok) return soket.emit('hata', b.sebep);
    io.to(kayit.odaId).emit('tur:buzz', {oyuncuId:soket.data.oyuncuId, saniye:BUZZ_SANIYE});
    kayit.zamanlayicilar.push(setTimeout(()=>{
      const t = kayit.duello.tur;
      if (t && !t.bitti && t.sahip === soket.data.oyuncuId)
        yayinla(kayit, soket.data.oyuncuId, kayit.duello.hakkiYak(soket.data.oyuncuId, 'Süre doldu.'));
    }, BUZZ_SANIYE*1000));
  });

  soket.on('mesafe', deger=>{
    const kayit = odalar.get(soket.data.odaId); if (!kayit) return;
    const m = kayit.duello.mesafe(soket.data.oyuncuId, deger);
    if (m) soket.to(kayit.odaId).emit('rakip:mesafe', m);   // yalnızca mesafe, yöntem değil
  });

  soket.on('joker', tip=>{
    const kayit = odalar.get(soket.data.odaId); if (!kayit) return;
    const j = kayit.duello.jokerKullan(soket.data.oyuncuId, tip);
    soket.emit('joker:sonuç', j);
    if (j.ok) soket.to(kayit.odaId).emit('rakip:joker', {tip});
  });

  soket.on('gönder', adimlar=>{
    const kayit = odalar.get(soket.data.odaId); if (!kayit) return;
    const s = kayit.duello.gonder(soket.data.oyuncuId, adimlar);
    if (!s.ok && !s.turBitti && s.sebep) soket.emit('hata', s.sebep);
    yayinla(kayit, soket.data.oyuncuId, s);
  });

  soket.on('disconnect', ()=>{
    const i = kuyruk.findIndex(k=>k.soket === soket);
    if (i >= 0){ clearTimeout(kuyruk[i].zamanlayici); kuyruk.splice(i,1); }
    const kayit = odalar.get(soket.data.odaId);
    if (kayit){ io.to(kayit.odaId).emit('rakip:ayrıldı'); }
    // TODO (Faz 3): kısa kopmalarda geri dönüş penceresi
  });
});

if (require.main === module)
  sunucu.listen(PORT, ()=>console.log('Sayı Arena dinliyor: http://localhost:'+PORT));

module.exports = {app, sunucu, io};
