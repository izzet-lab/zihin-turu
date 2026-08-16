'use strict';
/* ============================================================
   İNŞA
   Tek kaynak ilkesi ile "tek dosya çalışsın" ihtiyacı çakışıyor:
   ortak/oyun.js ayrı dursun isteniyor, ama sayfa tek başına da
   çalışmalı. Çözüm bu betik — mantığı kopyalamak yerine derleme
   anında gömüyor. Kural hâlâ tek yerde yazılı.

   Kullanım:  node insa.js
   Çıktı:     dagitim/  (olduğu gibi bir statik barındırmaya atılır)
   ============================================================ */

const fs = require('fs');
const yol = require('path');
const K = p => yol.join(__dirname, p);
const oku = p => fs.readFileSync(K(p), 'utf8');

const ortak    = oku('ortak/oyun.js');
const temelCss = oku('istemci/temel.css');
const ekCss    = oku('istemci/ek.css');
const govde    = oku('istemci/govde.html');
const kart     = oku('istemci/kart.js');
const istemci  = oku('istemci/istemci.js');

const sayfa = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Sayı Turu — altı sayı, bir hedef</title>
<meta name="description" content="Türkçe sayı turu oyunu. Çocuktan ustaya beş seviye, her gün herkese aynı bulmaca. Ücretsiz, üyeliksiz, çevrimdışı da çalışır.">
<meta name="theme-color" content="#050F13">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="ikon/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Sayı Turu">
<meta property="og:type" content="website">
<meta property="og:title" content="Sayı Turu — altı sayı, bir hedef">
<meta property="og:description" content="Her gün herkese aynı bulmaca. Çocuktan ustaya beş seviye.">
<meta property="og:image" content="ikon/ikon-512.png">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Chivo:wght@400;700;900&family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
<style>
${temelCss}

${ekCss}
</style>
</head>
<body>
${govde}

<!-- ortak/oyun.js — derleme anında gömüldü, elle düzenlenmemeli -->
<script>
${ortak}
</script>

<!-- istemci/kart.js -->
<script>
${kart}
</script>

<!-- istemci/istemci.js -->
<script>
${istemci}
</script>
</body>
</html>
`;

const cikis = K('dagitim');
fs.rmSync(cikis, {recursive:true, force:true});
fs.mkdirSync(yol.join(cikis, 'ikon'), {recursive:true});

fs.writeFileSync(yol.join(cikis, 'index.html'), sayfa, 'utf8');
fs.copyFileSync(K('istemci/manifest.json'), yol.join(cikis, 'manifest.json'));
fs.copyFileSync(K('istemci/sw.js'), yol.join(cikis, 'sw.js'));
for (const ikon of fs.readdirSync(K('istemci/ikon')))
  fs.copyFileSync(K('istemci/ikon/' + ikon), yol.join(cikis, 'ikon', ikon));

const kb = n => (n/1024).toFixed(1) + ' KB';
console.log('İnşa tamam → dagitim/');
console.log('  index.html        ' + kb(Buffer.byteLength(sayfa)));
console.log('    ├ oyun.js       ' + kb(ortak.length) + ' gömüldü');
console.log('    ├ kart.js       ' + kb(kart.length) + ' gömüldü');
console.log('    └ istemci.js    ' + kb(istemci.length) + ' gömüldü');
console.log('  manifest.json, sw.js, ikon/ (' + fs.readdirSync(K('istemci/ikon')).length + ' dosya)');
console.log('\nBu klasörü olduğu gibi statik barındırmaya yükle. Arka uç gerekmiyor.');
