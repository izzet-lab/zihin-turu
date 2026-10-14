/**
 * Yardım / "Nasıl oynanır" tam kural sayfası.
 *
 * Oyun kuralları, modlar, jokerler, lig mekaniği, seri ödülleri ve
 * XP seviyeleri — hepsi tek yerde. Dil sade, lise/ortaokul seviyesine
 * uygun; emir değil bilgi.
 */

import Ikon, { type IkonAdi } from '../bilesenler/Ikon';

interface Props {
  acik: boolean;
  kapat: () => void;
}

interface Madde {
  isaret: string;
  ad: string;
  aciklama: string;
}

/*
 * Bu liste OYUN EKRANINDA GÖRÜNENİ anlatmalı.
 *
 * Önceki sürümde ↶ ve ⟲ gibi ikonlar yazıyordu; oyun ekranında böyle
 * ikonlar hiç yok, düğmelerin üstünde düz yazı var. Yardım, olmayan bir
 * arayüzü tarif ediyordu — üstelik iki ikon birbirine o kadar benziyordu
 * ki hangisinin hangisi olduğu da anlaşılmıyordu. Artık `isaret` alanı
 * düğmenin gerçek yazısını taşıyor.
 */
const KONTROLLER: Madde[] = [
  { isaret: '7', ad: 'Taşlar', aciklama: 'Birleştireceğin sayılar. Önce bir taşa dokun.' },
  { isaret: '+ − × ÷', ad: 'İşlemler', aciklama: 'Taşı seçtikten sonra bir işlem seç, sonra ikinci taşa dokun. İkisi birleşir, yeni bir taş olur.' },
  { isaret: 'En yakın', ad: 'En yakın', aciklama: 'Hedefe ne kadar yaklaştığını gösterir. 0 fark = tam isabet.' },
  { isaret: 'Geri al', ad: 'Geri al', aciklama: 'Yalnızca son işlemi geri alır. Bir adım geri gidersin.' },
  { isaret: 'Sıfırla', ad: 'Sıfırla', aciklama: 'Bütün işlemleri siler, taşlar en baştaki hâline döner.' },
  { isaret: 'Bitir', ad: 'Bitir', aciklama: 'Turu bitirir; puanını ve bir çözümü gösterir.' },
];

export default function Yardim({ acik, kapat }: Props) {
  if (!acik) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center zt-perde px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Nasıl oynanır"
      data-alan="yardim"
      onClick={kapat}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border zt-cizgi zt-yuzey p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black zt-metin">Nasıl oynanır?</h2>
            <p className="mt-1 text-sm zt-metin-soluk">
              Sana verilen sayıları dört işlemle birleştirip <span className="zt-vurgu-metin">hedef sayıya</span> ulaş.
            </p>
          </div>
          <button
            onClick={kapat}
            aria-label="Kapat"
            className="min-h-[44px] min-w-[44px] rounded-lg border zt-cizgi zt-metin"
          >
            ✕
          </button>
        </div>

        {/* Adım adım */}
        <ol className="mt-4 space-y-2 text-sm zt-metin">
          <li className="rounded-lg zt-yuzey p-3">
            <span className="font-bold zt-vurgu-metin">1.</span> Bir <b>taşa</b> dokun.
          </li>
          <li className="rounded-lg zt-yuzey p-3">
            <span className="font-bold zt-vurgu-metin">2.</span> Bir <b>işlem</b> seç (+ − × ÷).
          </li>
          <li className="rounded-lg zt-yuzey p-3">
            <span className="font-bold zt-vurgu-metin">3.</span> İkinci <b>taşa</b> dokun — ikisi birleşir.
          </li>
          <li className="rounded-lg zt-yuzey p-3">
            <span className="font-bold zt-vurgu-metin">4.</span> Bunu tekrarlayıp <b>hedefe</b> ulaşmaya çalış.
          </li>
        </ol>

        {/* Kurallar */}
        <Bolum baslik="Kurallar">
          <ul className="space-y-1.5 text-sm zt-metin">
            <li>• Her taş <b>bir kez</b> kullanılır.</li>
            <li>• Ara sonuçlar <b>tam sayı</b> ve <b>pozitif</b> olmalı — negatif çıkan işlem geçersiz.</li>
            <li>• Bölme <b>kalansız</b> olmalı.</li>
            <li>• Tam isabet en çok puan getirir; yaklaşık sonuçlar da puan alır.</li>
          </ul>
        </Bolum>

        {/* Puanlama */}
        <Bolum baslik="Puanlama">
          <div className="space-y-1.5 text-sm zt-metin">
            <p><b className="zt-vurgu-metin">Tam isabet:</b> 100 puan + hız bonusu (0–50)</p>
            <p><b className="zt-metin">Yakın:</b> 70 puan</p>
            <p><b className="zt-metin">Uzak:</b> 50 puan</p>
            <p className="text-xs zt-metin-soluk">Günün Turu puanları ×10 çarpanla gösterilir. Antrenman puanları seviye ve süre çarpanıyla hesaplanır.</p>
          </div>
        </Bolum>

        {/* Modlar */}
        <Bolum baslik="Modlar">
          <div className="space-y-3 text-sm zt-metin">
            <div>
              <b className="zt-metin">Günün Turu</b>
              <p className="mt-0.5">Herkese aynı bulmaca, <b>günde bir hak</b>. Puanın <b>lige işler</b>. Her gün oynadıkça serin büyür.</p>
            </div>
            <div>
              <b className="zt-metin">Antrenman</b>
              <p className="mt-0.5">İstediğin kadar oyna. Süreyi ve büyük sayıları kendin ayarla. <b>XP kazandırır</b> ama lige işlemez.</p>
            </div>
          </div>
        </Bolum>

        {/* Jokerler */}
        <Bolum baslik="Jokerler">
          <div className="space-y-2 text-sm zt-metin">
            <p className="text-xs zt-metin-soluk">
              Tur başına en fazla 3 joker kullanabilirsin. Bedel, çarpanlar
              uygulanmadan <b>önce</b> düşülür — yani üçünü de kullanırsan
              puanının yaklaşık yarısını verirsin.
            </p>
            <div className="space-y-2">
              <JokerSatir simge="ampul" ad="Adım ipucu" bedel={3} aciklama="Çözümün bir adımını gösterir." />
              <JokerSatir simge="silgi" ad="Yanlışı sil" bedel={2} aciklama="Çözümde kullanılmayan bir taşı siler." />
              <JokerSatir simge="kronometre" ad="Süre ekle" bedel={2} aciklama="+15 saniye ek süre verir." />
            </div>
          </div>
        </Bolum>

        {/* Lig */}
        <Bolum baslik="Lig (Sıralamalar)">
          <div className="space-y-2 text-sm zt-metin">
            <p><b>Günlük:</b> O günkü Günün Turu puanın. Tek tur, tek puan.</p>
            <p><b>Haftalık:</b> O haftanın günlük puanlarının toplamı. Pazartesi sıfırlanır.</p>
            <p><b>Aylık:</b> O ayın günlük puanlarının toplamı. Ayın 1'inde sıfırlanır.</p>
            <p><b>Antrenman:</b> Haftalık antrenman puanı toplamı — çalışkanlık tablosu.</p>
            <p className="text-xs zt-metin-soluk">Her seviyenin kendi tablosu var. Giriş yapan oyuncular sıralamaya girer.</p>
          </div>
        </Bolum>

        {/* Seri ödülleri */}
        <Bolum baslik="Seri Ödülleri">
          <div className="space-y-1.5 text-sm zt-metin">
            <p className="text-xs zt-metin-soluk">Günün turunu <b>tamamla</b> (açmak yetmez, turu bitirmek gerekir).</p>
            {/* Rozet adları ve simgeleri `rozetler.ts` kataloğuyla aynı
                olmak zorunda; burada "🏅 Günlük" yazıp Sıralamalar'da
                başka bir şey göstermek vaat edilen şeyi vermemek olur.
                "Her gün" satırının rozeti yok — yalnızca XP veriyor. */}
            <SeriSatir gun="Her gün" xp={10} rozet="—" />
            <SeriSatir gun="3 gün üst üste" xp={25} rozet="🔥 Üç Gün" />
            <SeriSatir gun="7 gün üst üste" xp={75} rozet="🗓️ Haftalık" />
            <SeriSatir gun="30 gün üst üste" xp={300} rozet="📆 Aylık" />
            <SeriSatir gun="100 gün üst üste" xp={1000} rozet="💯 Yüz Gün" />
            <p className="mt-2 text-xs zt-metin-soluk">
              Rozetlerin tamamı <b>Sıralamalar</b> sayfasında; kazanmadıkların
              da soluk olarak görünür, hedef olsun diye.
            </p>
            <p className="mt-2 text-xs zt-metin-soluk">
              Ayda bir <b>seri koruma</b> hakkın var: serin kırılırsa kısa bir
              reklam izleyip geri alabilirsin. Hak her ayın başında tazelenir.
            </p>
          </div>
        </Bolum>

        {/* XP Seviyeleri */}
        <Bolum baslik="Oyuncu Seviyeleri (XP)">
          <div className="text-sm zt-metin">
            <p className="mb-2 text-xs zt-metin-soluk">Antrenman puanları ve seri ödülleri XP olarak birikir. Hiç sıfırlanmaz.</p>
            <div className="divide-y divide-slate-800 rounded-lg zt-yuzey">
              <XpSatir seviye={1} unvan="Çaylak" xp={0} />
              <XpSatir seviye={2} unvan="Hesapçı" xp={500} />
              <XpSatir seviye={3} unvan="Zihin İşçisi" xp={2000} />
              <XpSatir seviye={4} unvan="Rakam Ustası" xp={5000} />
              <XpSatir seviye={5} unvan="Tam İsabet Ustası" xp={12000} />
            </div>
          </div>
        </Bolum>

        {/* Düğmeler */}
        <Bolum baslik="Düğmeler">
          <ul className="space-y-2">
            {KONTROLLER.map((m) => (
              <li key={m.ad} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex min-h-[32px] min-w-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-md border zt-cizgi zt-yuzey px-2 text-xs font-black zt-vurgu-metin">
                  {m.isaret}
                </span>
                <div className="text-sm">
                  {/* İşaret düğmenin gerçek yazısıysa adı tekrar yazma —
                      "Geri al / Geri al" diye çift satır çıkıyordu. */}
                  {m.isaret !== m.ad && <div className="font-bold zt-metin">{m.ad}</div>}
                  <div className="zt-metin-soluk">{m.aciklama}</div>
                </div>
              </li>
            ))}
          </ul>
        </Bolum>

        <button
          onClick={kapat}
          data-alan="yardim-anladim"
          className="mt-6 min-h-[52px] w-full rounded-xl zt-dugme text-base font-black zt-metin "
        >
          Anladım
        </button>
      </div>
    </div>
  );
}

/* --- Yardımcı bileşenler --- */

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="mt-5 text-xs font-bold uppercase tracking-widest zt-metin-soluk">{baslik}</h3>
      <div className="mt-2">{children}</div>
    </>
  );
}

function JokerSatir({
  simge,
  ad,
  bedel,
  aciklama,
}: {
  simge: IkonAdi;
  ad: string;
  bedel: number;
  aciklama: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg zt-yuzey p-2.5">
      <Ikon ad={simge} boyut={18} className="mt-0.5 zt-vurgu-metin" />
      <div>
        <span className="font-bold zt-metin">{ad}</span>
        {/*
          Bedel TEMEL puandan düşülür. Günün Turu puanları ×10
          gösterildiği için orada bu sayı on katı görünür — bunu
          söylememek "3 puan mı kaybettim?" diye düşündürüyordu.
        */}
        <span className="ml-1.5 text-xs zt-odul-yazi">
          −{bedel} <span className="zt-odul-yazi/60">(Günün Turu'nda −{bedel * 10})</span>
        </span>
        <p className="text-xs zt-metin-soluk">{aciklama}</p>
      </div>
    </div>
  );
}

function SeriSatir({ gun, xp, rozet }: { gun: string; xp: number; rozet: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg zt-yuzey px-3 py-2">
      <span className="zt-metin">{gun}</span>
      <span className="text-xs">
        <span className="zt-vurgu-metin font-bold">+{xp} XP</span>
        {rozet && <span className="ml-2">{rozet}</span>}
      </span>
    </div>
  );
}

function XpSatir({ seviye, unvan, xp }: { seviye: number; unvan: string; xp: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-1">
      <span className="zt-metin">
        <span className="font-bold zt-vurgu-metin">Lv.{seviye}</span> {unvan}
      </span>
      <span className="text-xs zt-metin-soluk">{xp.toLocaleString('tr-TR')} XP</span>
    </div>
  );
}
