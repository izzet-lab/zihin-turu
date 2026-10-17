/**
 * Yardım / "Nasıl oynanır" tam kural sayfası.
 *
 * İKİ OYUN ANLATILIYOR
 * Sayfa uzun süre yalnızca sayı turunu anlatıyordu; kelime turu,
 * düello ve arena eklendiği hâlde yardım eski hâlinde kaldı. Oyuncu
 * arayüzde gördüğü üç modun hiçbirinin açıklamasını bulamıyordu.
 * Artık sayfa iki oyunu ve dört modu birden anlatıyor.
 *
 * KURAL: BURADA YAZAN ŞEY ARAYÜZDE OLMALI
 * Puanlar, seviye adları, süreler, rozet adları ve XP eşikleri
 * `paketler/oyun-*` ve `rozetler.ts` ile aynı olmak zorunda. Burada
 * verilen söz tutulmuyorsa bu bir hatadır.
 */

import Ikon, { type IkonAdi } from '../bilesenler/Ikon';
import { sayiTuru } from '@tamisabet/oyun-sayi';
import { genelSeviyeAgirligi } from '@tamisabet/cekirdek';
import { ROZETLER } from '../rozetler';


/**
 * Genel sıralamanın seviye ağırlıkları.
 *
 * Değerler çekirdek paketteki `lig.ts` dosyasından geliyor; burada elle
 * yazılsaydı yardım sayfası ile tablo ayrışabilirdi — oyuncuya söylenen
 * hesapla tabloya yazılan hesabın farklı olması, puanı yanlış
 * hesaplamaktan daha kötü. Sıralama (Isınma'dan Usta'ya) sayı turunun
 * seviye listesinden okunuyor.
 */
const GENEL_AGIRLIKLAR = sayiTuru.seviyeler.map((s) => ({
  ad: s.etiket,
  carpan: String(genelSeviyeAgirligi(s.anahtar)).replace('.', ','),
}));

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
 * arayüzü tarif ediyordu. Artık `isaret` alanı düğmenin gerçek
 * yazısını taşıyor.
 */
const KONTROLLER: Madde[] = [
  { isaret: '7', ad: 'Taşlar', aciklama: 'Birleştireceğin sayılar. Önce bir taşa dokun.' },
  { isaret: '+ − × ÷', ad: 'İşlemler', aciklama: 'Taşı seçtikten sonra bir işlem seç, sonra ikinci taşa dokun. İkisi birleşir, yeni bir taş olur.' },
  { isaret: 'En yakın', ad: 'En yakın', aciklama: 'Hedefe ne kadar yaklaştığını gösterir. 0 fark = tam isabet.' },
  { isaret: 'Geri al', ad: 'Geri al', aciklama: 'Yalnızca son işlemi geri alır. Bir adım geri gidersin.' },
  { isaret: 'Sıfırla', ad: 'Sıfırla', aciklama: 'Bütün işlemleri siler, taşlar en baştaki hâline döner.' },
  { isaret: 'Bitir', ad: 'Bitir', aciklama: 'Turu bitirir; puanını ve bir çözümü gösterir.' },
];

/** Seviye tablosu — iki oyun için de aynı dört seviye. */
const SEVIYELER = [
  { ad: 'Isınma', sayi: '2 haneli hedef, 4 taş', kelime: '7 harf', sure: '60 sn' },
  { ad: 'Normal', sayi: '3 haneli hedef, 5 taş', kelime: '8 harf', sure: '60 sn' },
  { ad: 'Zor', sayi: '4 haneli hedef, 6 taş', kelime: '9 harf', sure: '75 sn' },
  { ad: 'Usta', sayi: '5 haneli hedef, 7 taş', kelime: '10 harf', sure: '90 sn' },
];

export default function Yardim({ acik, kapat }: Props) {
  if (!acik) return null;

  // Rozet adları katalogdan okunuyor; elle yazılırsa Sıralamalar'da
  // başka bir ad görünür ve verilen söz tutulmamış olur.
  const seriRozet = (kod: string) => ROZETLER.find((r) => r.kod === kod)?.ad ?? '';

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
              İki oyun var: <span className="zt-vurgu-metin">Sayı Turu</span> ve{' '}
              <span className="zt-vurgu-metin">Kelime Turu</span>. İkisi de aynı
              seviyeleri, aynı ligi ve aynı modları kullanır.
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

        {/* SAYI TURU */}
        <Bolum baslik="Sayı Turu" simge="sayi">
          <p className="text-sm zt-metin-soluk">
            Verilen taşları dört işlemle birleştirip{' '}
            <b className="zt-vurgu-metin">hedef sayıya</b> ulaş.
          </p>
          <ol className="mt-2 space-y-2 text-sm zt-metin">
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
          <ul className="mt-2 space-y-1.5 text-sm zt-metin">
            <li>• Her taş <b>bir kez</b> kullanılır.</li>
            <li>• Ara sonuçlar <b>tam sayı</b> ve <b>pozitif</b> olmalı — negatif çıkan işlem geçersiz.</li>
            <li>• Bölme <b>kalansız</b> olmalı.</li>
            <li>• Tam isabet en çok puan getirir; yaklaşık sonuçlar da puan alır.</li>
          </ul>
        </Bolum>

        {/* KELİME TURU */}
        <Bolum baslik="Kelime Turu" simge="kelime">
          <p className="text-sm zt-metin-soluk">
            Verilen harflerden <b className="zt-vurgu-metin">en uzun Türkçe kelimeyi</b> türet.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm zt-metin">
            <li>• Harflere dokunarak kelimeyi kur, <b>Gönder</b> düğmesine bas.</li>
            <li>• Her harf <b>bir kez</b> kullanılır; kelime en az <b>3 harf</b> olmalı.</li>
            <li>• Kelime <b>sözlükte</b> bulunmalı. Çekimli biçimler kabul edilir — "kitabı", "evlerimizde", "kalemle" gibi.</li>
            <li>• Özel adlar ve kısaltmalar sözlükte yok.</li>
            <li>• Puan, yazdığın kelimenin <b>bulunabilecek en uzun kelimeye oranına</b> göre verilir. En uzunu bulursan tam isabet.</li>
          </ul>
          <p className="mt-2 text-xs zt-metin-soluk">
            Tur bitince o turda bulunabilecek en uzun kelime gösterilir.
          </p>
        </Bolum>

        {/* SEVİYELER */}
        <Bolum baslik="Seviyeler" simge="etiket">
          <div className="overflow-hidden rounded-lg border zt-cizgi">
            {SEVIYELER.map((s, i) => (
              <div
                key={s.ad}
                className={`flex items-start justify-between gap-2 px-3 py-2 text-sm ${
                  i > 0 ? 'border-t zt-cizgi' : ''
                }`}
              >
                <span className="font-bold zt-vurgu-metin">{s.ad}</span>
                <span className="text-right text-xs zt-metin-soluk">
                  <span className="block zt-metin">{s.sayi}</span>
                  <span className="block">
                    Kelime: {s.kelime} · {s.sure}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs zt-metin-soluk">
            Süreler Günün Turu, düello ve arena için geçerli. Antrenman'da
            süreyi kendin seçersin.
          </p>
        </Bolum>

        {/* MODLAR */}
        <Bolum baslik="Modlar" simge="gunun">
          <div className="space-y-3 text-sm zt-metin">
            <div>
              <b className="zt-metin">Günün Turu</b>
              <p className="mt-0.5">
                Herkese aynı bulmaca, <b>günde bir hak</b>. Puanın <b>lige işler</b>.
                Her gün oynadıkça serin büyür. Burada joker reklamı yoktur.
              </p>
            </div>
            <div>
              <b className="zt-metin">Antrenman</b>
              <p className="mt-0.5">
                İstediğin kadar oyna. Süreyi ve zorluğu kendin ayarla.{' '}
                <b>XP kazandırır</b>, beceri ligine işlemez — ayrı bir
                "çalışkanlık" tablosu vardır.
              </p>
            </div>
            <div>
              <b className="zt-metin">Düello</b>
              <p className="mt-0.5">
                1'e 1, <b>5 tur</b>. Tam isabeti ilk bulan turu anında kapatır;
                kimse bulamazsa süre sonunda hedefe en yakın olan kazanır.
                Rakibinin yalnızca <b>hedefe uzaklığı</b> görünür — hangi taşı ya
                da harfi kullandığı asla gösterilmez. 8 saniyede rakip
                bulunamazsa karşına bot çıkar. Kazanınca derecen yükselir.
              </p>
            </div>
            <div>
              <b className="zt-metin">Arena</b>
              <p className="mt-0.5">
                <b>5 kişi aynı anda</b>, 5 tur. Sıra beklemek yok. İlk tam isabet
                turu kapatır. Boş koltuklar botla dolar. Sonunda podyum, kupa ve
                madalya. Madalyanın sayılması için arenada{' '}
                <b>en az iki gerçek oyuncu</b> olmalı.
              </p>
            </div>
          </div>
        </Bolum>

        {/* PUANLAMA */}
        <Bolum baslik="Puanlama" simge="yildiz">
          <div className="space-y-1.5 text-sm zt-metin">
            <p>
              <b className="zt-vurgu-metin">Tam isabet:</b> 100 puan + hız bonusu (0–50)
            </p>
            <p>
              <b className="zt-metin">Yakın:</b> 70 puan
            </p>
            <p>
              <b className="zt-metin">Uzak:</b> 50 puan
            </p>
            <p className="text-xs zt-metin-soluk">
              Düello ve arenada tam isabeti ilk bulan ayrıca küçük bir prim alır.
            </p>
            <p className="text-xs zt-metin-soluk">
              Günün Turu puanları ×10 çarpanla gösterilir. Antrenman puanları
              seviye ve süre çarpanıyla hesaplanır: süre kısaldıkça ve seviye
              yükseldikçe çarpan büyür.
            </p>
            <p className="text-xs zt-metin-soluk">
              Puanı her zaman <b>sunucu</b> hesaplar; gönderdiğin cevap sıfırdan
              yeniden denetlenir.
            </p>
          </div>
        </Bolum>

        {/* JOKERLER */}
        <Bolum baslik="Jokerler" simge="ampul">
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

        {/* GENEL SIRALAMA */}
        <Bolum baslik="Genel Sıralama" simge="kupa">
          <div className="space-y-2 text-sm zt-metin">
            <p>
              Platformun ana tablosu. <b>İki oyunun toplamını</b> sayar: o günün Sayı Turu puanı
              artı o günün Kelime Turu puanı. Tek alanda iyi olmak değil, iki alanda birden iyi
              olmak kazandırır.
            </p>
            <p className="text-xs zt-metin-soluk">
              Seviyeden bağımsızdır — Usta oynayanla Isınma oynayan aynı listededir. Bu yüzden
              burada (ve yalnızca burada) seviye ağırlığı uygulanır:
            </p>
            <div className="overflow-hidden rounded-lg border zt-cizgi">
              {GENEL_AGIRLIKLAR.map((a, i) => (
                <div
                  key={a.ad}
                  className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                    i > 0 ? 'border-t zt-cizgi' : ''
                  }`}
                >
                  <span className="zt-metin">{a.ad}</span>
                  <span className="zt-rakam font-bold zt-vurgu-metin">×{a.carpan}</span>
                </div>
              ))}
            </div>
            <p className="mt-2">
              <b className="zt-odul-yazi">Çifte tur bonusu:</b> aynı gün hem Sayı hem Kelime Günün
              Turu'nu bitirirsen o günün toplamına <b>%25</b> eklenir. Tek oyun oynayan ceza
              almaz; ikisini birden oynayan ödüllendirilir.
            </p>
            <p className="text-xs zt-metin-soluk">
              Örnek: Zor seviyede 150 puanlık bir sayı turu (×1,4 = 210) ve Normal seviyede 150
              puanlık bir kelime turu (×1 = 150) toplam 360 eder; çifte tur bonusuyla
              <b className="zt-metin"> 450</b>.
            </p>
            <p className="text-xs zt-metin-soluk">
              Haftalık ve aylık genel puan, günlük genel puanların toplamıdır. Antrenman genel
              tabloya işlemez.
            </p>
          </div>
        </Bolum>

        {/* LİG */}
        <Bolum baslik="Lig (Sıralamalar)" simge="siralama">
          <div className="space-y-2 text-sm zt-metin">
            <p>
              <b>Günlük:</b> O günkü Günün Turu puanın. Tek tur, tek puan.
            </p>
            <p>
              <b>Haftalık:</b> O haftanın günlük puanlarının toplamı. Pazartesi sıfırlanır.
            </p>
            <p>
              <b>Aylık:</b> O ayın günlük puanlarının toplamı. Ayın 1'inde sıfırlanır.
            </p>
            <p>
              <b>Antrenman:</b> Haftalık antrenman puanı toplamı — çalışkanlık tablosu.
            </p>
            <p className="text-xs zt-metin-soluk">
              Bu dört tablo <b>her oyun ve her seviye için ayrıdır</b>: Sayı Turu
              Zor ile Kelime Turu Zor ayrı listelerdir. Sıralamalar sayfasında
              başlığın altında hangi tabloya baktığın yazar.
            </p>
            <p className="text-xs zt-metin-soluk">
              <b>Düello derecesi ve arena madalyası ise iki oyunu birlikte sayar</b>{' '}
              — sayı turu maçın da kelime turu maçın da aynı dereceye işler.
            </p>
            <p className="text-xs zt-metin-soluk">
              Sıralamaya yalnızca giriş yapan oyuncular girer.
            </p>
          </div>
        </Bolum>

        {/* SERİ */}
        <Bolum baslik="Seri Ödülleri" simge="seri">
          <div className="space-y-1.5 text-sm zt-metin">
            <p className="text-xs zt-metin-soluk">
              Günün turunu <b>tamamla</b> (açmak yetmez, turu bitirmek gerekir).
              Hangi oyunu oynadığın fark etmez — seri alışkanlığı ölçer, beceriyi
              değil.
            </p>
            <SeriSatir gun="Her gün" xp={10} rozet="" />
            <SeriSatir gun="3 gün üst üste" xp={25} rozet={seriRozet('seri_3')} />
            <SeriSatir gun="7 gün üst üste" xp={75} rozet={seriRozet('seri_7')} />
            <SeriSatir gun="30 gün üst üste" xp={300} rozet={seriRozet('seri_30')} />
            <SeriSatir gun="100 gün üst üste" xp={1000} rozet={seriRozet('seri_100')} />
            <p className="mt-2 text-xs zt-metin-soluk">
              Rozetlerin tamamı <b>Sıralamalar</b> sayfasında; kazanmadıkların da
              soluk olarak görünür, hedef olsun diye. Her rozetin üstünde hangi
              oyundan geldiği yazar.
            </p>
            <p className="mt-2 text-xs zt-metin-soluk">
              Ayda bir <b>seri koruma</b> hakkın var: serin kırılırsa kısa bir
              reklam izleyip geri alabilirsin. Hak her ayın başında tazelenir.
            </p>
          </div>
        </Bolum>

        {/* XP */}
        <Bolum baslik="Oyuncu Seviyeleri (XP)" simge="profil">
          <div className="text-sm zt-metin">
            <p className="mb-2 text-xs zt-metin-soluk">
              Antrenman puanları ve seri ödülleri XP olarak birikir. Hiç sıfırlanmaz.
            </p>
            <div className="overflow-hidden rounded-lg border zt-cizgi">
              <XpSatir seviye={1} unvan="Çaylak" xp={0} ilk />
              <XpSatir seviye={2} unvan="Hesapçı" xp={500} />
              <XpSatir seviye={3} unvan="Zihin İşçisi" xp={2000} />
              <XpSatir seviye={4} unvan="Rakam Ustası" xp={5000} />
              <XpSatir seviye={5} unvan="Tam İsabet Ustası" xp={12000} />
            </div>
          </div>
        </Bolum>

        {/* DÜĞMELER */}
        <Bolum baslik="Sayı turu düğmeleri" simge="sayi">
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
          <p className="mt-2 text-xs zt-metin-soluk">
            Kelime turunda bunların yerine harf rafı, <b>Sil</b> ve <b>Gönder</b>{' '}
            düğmeleri vardır.
          </p>
        </Bolum>

        {/* SES */}
        <Bolum baslik="Ses ve titreşim" simge="ses-acik">
          <p className="text-sm zt-metin-soluk">
            Profil sayfandaki <b className="zt-metin">Oyun ayarları</b> bölümünden
            ses ve titreşimi açıp kapatabilirsin. Giriş yapmadıysan aynı ayarlar
            gizlilik ayarlarında durur.
          </p>
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

function Bolum({
  baslik,
  simge,
  children,
}: {
  baslik: string;
  simge?: IkonAdi;
  children: React.ReactNode;
}) {
  return (
    <>
      <h3 className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest zt-metin-soluk">
        {simge && <Ikon ad={simge} boyut={14} />}
        {baslik}
      </h3>
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
          −{bedel} <span className="zt-odul-yazi">(Günün Turu'nda −{bedel * 10})</span>
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
        {/* Rozet adı katalogdan geliyor; emoji yerine seri ikonu
            kullanılıyor — emoji her telefonda başka çiziliyor. */}
        {rozet && (
          <span className="ml-2 inline-flex items-center gap-1 zt-metin-soluk">
            <Ikon ad="seri" boyut={13} />
            {rozet}
          </span>
        )}
      </span>
    </div>
  );
}

function XpSatir({
  seviye,
  unvan,
  xp,
  ilk,
}: {
  seviye: number;
  unvan: string;
  xp: number;
  ilk?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 ${ilk ? '' : 'border-t zt-cizgi'}`}
    >
      <span className="zt-metin">
        <span className="font-bold zt-vurgu-metin">Lv.{seviye}</span> {unvan}
      </span>
      <span className="text-xs zt-metin-soluk">{xp.toLocaleString('tr-TR')} XP</span>
    </div>
  );
}
