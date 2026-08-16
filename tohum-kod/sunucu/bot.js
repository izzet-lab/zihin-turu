'use strict';
/* ============================================================
   BOT
   Kelime Tahmin'in en önemli ürün kararı bu: rakip bulunamazsa
   bot devreye giriyor, maç asla kurulamadan ölmüyor. Küçük bir
   oyuncu tabanıyla açılışta hayatta kalmanın tek yolu.

   Bot "hile yapmasın" diye çözümü hazır almıyor; kendi çözücüsünü
   sınırlı süreyle çalıştırıyor. Seviye düştükçe süre sınırı ve
   isabet olasılığı düşüyor — böylece zayıf bot gerçekten zayıf.
   ============================================================ */

const O = require('../ortak/oyun');

const PROFILLER = {
  acemi:  {isabet:0.35, minGecikme:14, maxGecikme:26, aramaMs:40,  yakinlik:12},
  orta:   {isabet:0.62, minGecikme:9,  maxGecikme:18, aramaMs:150, yakinlik:6},
  usta:   {isabet:0.88, minGecikme:5,  maxGecikme:11, aramaMs:600, yakinlik:2}
};

const ADLAR = ['Emine K.','Murat Ş.','Hasan T.','Sena Ö.','Mustafa Y.','İbrahim K.','Meryem A.','Ömer K.'];

function botUret(elo){
  const profil = elo < 1000 ? 'acemi' : elo < 1400 ? 'orta' : 'usta';
  return {
    id: 'bot:' + Math.random().toString(36).slice(2,9),
    ad: ADLAR[Math.floor(Math.random()*ADLAR.length)],
    bot: true,
    profil
  };
}

/* Botun bu tur ne yapacağına karar verir.
   Döner: {gecikmeMs, adimlar} — adimlar null ise bot bu turu pas geçer. */
function botPlani(bot, tur){
  const p = PROFILLER[bot.profil];
  const gecikme = (p.minGecikme + Math.random()*(p.maxGecikme - p.minGecikme)) * 1000;

  // Bot kendi çözücüsünü kısıtlı süreyle çalıştırır
  const bulunan = O.coz(tur.sayilar, tur.hedef, p.aramaMs);
  if (bulunan.fark !== 0) {
    // Tam bulamadıysa yaklaşık cevabı varsa onu gönderir
    return bulunan.adimlar.length && bulunan.fark <= p.yakinlik
      ? {gecikmeMs: gecikme, adimlar: bulunan.adimlar}
      : {gecikmeMs: gecikme, adimlar: null};
  }
  // Tam çözümü bulsa bile profil isabetine göre bazen kaçırır
  if (Math.random() > p.isabet){
    const kisa = bulunan.adimlar.slice(0, Math.max(1, bulunan.adimlar.length - 1));
    return {gecikmeMs: gecikme, adimlar: kisa};   // yarım kalmış zincir
  }
  return {gecikmeMs: gecikme, adimlar: bulunan.adimlar};
}

module.exports = {botUret, botPlani, PROFILLER};
