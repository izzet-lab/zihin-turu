/**
 * Yardım / "Nasıl oynanır" tam kural sayfası.
 *
 * Oyun kuralları, modlar, jokerler, lig mekaniği, seri ödülleri ve
 * XP seviyeleri — hepsi tek yerde. Dil sade, lise/ortaokul seviyesine
 * uygun; emir değil bilgi.
 */

interface Props {
  acik: boolean;
  kapat: () => void;
}

interface Madde {
  isaret: string;
  ad: string;
  aciklama: string;
}

const KONTROLLER: Madde[] = [
  { isaret: '7', ad: 'Taşlar', aciklama: 'Birleştireceğin sayılar. Önce bir taşa dokun.' },
  { isaret: '+ − × ÷', ad: 'İşlemler', aciklama: 'Taşı seçtikten sonra bir işlem seç, sonra ikinci taşa dokun. İkisi birleşir, yeni bir taş olur.' },
  { isaret: '◎', ad: 'En yakın', aciklama: 'Hedefe ne kadar yaklaştığını gösterir. 0 fark = tam isabet.' },
  { isaret: '↶', ad: 'Geri al', aciklama: 'Son yaptığın işlemi geri alır.' },
  { isaret: '⟲', ad: 'Sıfırla', aciklama: 'Taşları başa döndürür, baştan denersin.' },
  { isaret: '✓', ad: 'Bitir', aciklama: 'Turu bitirir; puanını ve bir çözümü gösterir.' },
];

export default function Yardim({ acik, kapat }: Props) {
  if (!acik) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Nasıl oynanır"
      data-alan="yardim"
      onClick={kapat}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-[#0E1424] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Nasıl oynanır?</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sana verilen sayıları dört işlemle birleştirip <span className="text-cyan-300">hedef sayıya</span> ulaş.
            </p>
          </div>
          <button
            onClick={kapat}
            aria-label="Kapat"
            className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-700 text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Adım adım */}
        <ol className="mt-4 space-y-2 text-sm text-slate-300">
          <li className="rounded-lg bg-slate-900/50 p-3">
            <span className="font-bold text-cyan-300">1.</span> Bir <b>taşa</b> dokun.
          </li>
          <li className="rounded-lg bg-slate-900/50 p-3">
            <span className="font-bold text-cyan-300">2.</span> Bir <b>işlem</b> seç (+ − × ÷).
          </li>
          <li className="rounded-lg bg-slate-900/50 p-3">
            <span className="font-bold text-cyan-300">3.</span> İkinci <b>taşa</b> dokun — ikisi birleşir.
          </li>
          <li className="rounded-lg bg-slate-900/50 p-3">
            <span className="font-bold text-cyan-300">4.</span> Bunu tekrarlayıp <b>hedefe</b> ulaşmaya çalış.
          </li>
        </ol>

        {/* Kurallar */}
        <Bolum baslik="Kurallar">
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>• Her taş <b>bir kez</b> kullanılır.</li>
            <li>• Ara sonuçlar <b>tam sayı</b> ve <b>pozitif</b> olmalı — negatif çıkan işlem geçersiz.</li>
            <li>• Bölme <b>kalansız</b> olmalı.</li>
            <li>• Tam isabet en çok puan getirir; yaklaşık sonuçlar da puan alır.</li>
          </ul>
        </Bolum>

        {/* Puanlama */}
        <Bolum baslik="Puanlama">
          <div className="space-y-1.5 text-sm text-slate-300">
            <p><b className="text-cyan-300">Tam isabet:</b> 100 puan + hız bonusu (0–50)</p>
            <p><b className="text-slate-200">Yakın:</b> 70 puan</p>
            <p><b className="text-slate-200">Uzak:</b> 50 puan</p>
            <p className="text-xs text-slate-500">Günün Turu puanları ×10 çarpanla gösterilir. Antrenman puanları seviye ve süre çarpanıyla hesaplanır.</p>
          </div>
        </Bolum>

        {/* Modlar */}
        <Bolum baslik="Modlar">
          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <b className="text-slate-100">Günün Turu</b>
              <p className="mt-0.5">Herkese aynı bulmaca, <b>günde bir hak</b>. Puanın <b>lige işler</b>. Her gün oynadıkça serin büyür.</p>
            </div>
            <div>
              <b className="text-slate-100">Antrenman</b>
              <p className="mt-0.5">İstediğin kadar oyna. Süreyi ve büyük sayıları kendin ayarla. <b>XP kazandırır</b> ama lige işlemez.</p>
            </div>
          </div>
        </Bolum>

        {/* Jokerler */}
        <Bolum baslik="Jokerler">
          <div className="space-y-2 text-sm text-slate-300">
            <p className="text-xs text-slate-500">Tur başına en fazla 3 joker kullanabilirsin. Her joker puandan düşer.</p>
            <div className="space-y-2">
              <JokerSatir emoji="💡" ad="Adım ipucu" bedel={3} aciklama="Çözümün bir adımını gösterir." />
              <JokerSatir emoji="❌" ad="Yanlışı sil" bedel={2} aciklama="Çözümde kullanılmayan bir taşı siler." />
              <JokerSatir emoji="⏱" ad="Süre ekle" bedel={2} aciklama="+15 saniye ek süre verir." />
            </div>
          </div>
        </Bolum>

        {/* Lig */}
        <Bolum baslik="Lig (Sıralamalar)">
          <div className="space-y-2 text-sm text-slate-300">
            <p><b>Günlük:</b> O günkü Günün Turu puanın. Tek tur, tek puan.</p>
            <p><b>Haftalık:</b> O haftanın günlük puanlarının toplamı. Pazartesi sıfırlanır.</p>
            <p><b>Aylık:</b> O ayın günlük puanlarının toplamı. Ayın 1'inde sıfırlanır.</p>
            <p><b>Antrenman:</b> Haftalık antrenman puanı toplamı — çalışkanlık tablosu.</p>
            <p className="text-xs text-slate-500">Her seviyenin kendi tablosu var. Giriş yapan oyuncular sıralamaya girer.</p>
          </div>
        </Bolum>

        {/* Seri ödülleri */}
        <Bolum baslik="Seri Ödülleri">
          <div className="space-y-1.5 text-sm text-slate-300">
            <p className="text-xs text-slate-500">Günün turunu <b>tamamla</b> (açmak yetmez, turu bitirmek gerekir).</p>
            <SeriSatir gun="Her gün" xp={10} rozet="" />
            <SeriSatir gun="3 gün üst üste" xp={25} rozet="" />
            <SeriSatir gun="7 gün üst üste" xp={75} rozet="🏅 Haftalık" />
            <SeriSatir gun="30 gün üst üste" xp={300} rozet="🏅 Aylık" />
            <SeriSatir gun="100 gün üst üste" xp={1000} rozet="🏅 Yüz Gün" />
            <p className="mt-2 text-xs text-slate-500">
              Ayda bir <b>seri koruma</b> hakkın var: bir gün kaçırırsan seri kırılmaz.
            </p>
          </div>
        </Bolum>

        {/* XP Seviyeleri */}
        <Bolum baslik="Oyuncu Seviyeleri (XP)">
          <div className="space-y-1.5 text-sm text-slate-300">
            <p className="text-xs text-slate-500">Antrenman puanları ve seri ödülleri XP olarak birikir. Hiç sıfırlanmaz.</p>
            <XpSatir seviye={1} unvan="Çaylak" xp={0} />
            <XpSatir seviye={2} unvan="Hesapçı" xp={500} />
            <XpSatir seviye={3} unvan="Zihin İşçisi" xp={2000} />
            <XpSatir seviye={4} unvan="Rakam Ustası" xp={5000} />
            <XpSatir seviye={5} unvan="Zihin Turu Ustası" xp={12000} />
          </div>
        </Bolum>

        {/* Düğmeler */}
        <Bolum baslik="Düğmeler">
          <ul className="space-y-2">
            {KONTROLLER.map((m) => (
              <li key={m.ad} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex min-h-[32px] min-w-[44px] items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 px-2 text-sm font-black text-cyan-200">
                  {m.isaret}
                </span>
                <div className="text-sm">
                  <div className="font-bold text-slate-100">{m.ad}</div>
                  <div className="text-slate-400">{m.aciklama}</div>
                </div>
              </li>
            ))}
          </ul>
        </Bolum>

        <button
          onClick={kapat}
          data-alan="yardim-anladim"
          className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
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
      <h3 className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">{baslik}</h3>
      <div className="mt-2">{children}</div>
    </>
  );
}

function JokerSatir({ emoji, ad, bedel, aciklama }: { emoji: string; ad: string; bedel: number; aciklama: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-900/50 p-2.5">
      <span className="text-lg">{emoji}</span>
      <div>
        <span className="font-bold text-slate-100">{ad}</span>
        <span className="ml-1.5 text-xs text-amber-300">−{bedel} puan</span>
        <p className="text-xs text-slate-400">{aciklama}</p>
      </div>
    </div>
  );
}

function SeriSatir({ gun, xp, rozet }: { gun: string; xp: number; rozet: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
      <span className="text-slate-200">{gun}</span>
      <span className="text-xs">
        <span className="text-cyan-300 font-bold">+{xp} XP</span>
        {rozet && <span className="ml-2">{rozet}</span>}
      </span>
    </div>
  );
}

function XpSatir({ seviye, unvan, xp }: { seviye: number; unvan: string; xp: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
      <span className="text-slate-200">
        <span className="font-bold text-cyan-300">Lv.{seviye}</span> {unvan}
      </span>
      <span className="text-xs text-slate-500">{xp.toLocaleString('tr-TR')} XP</span>
    </div>
  );
}
