/**
 * Yardım / ilk tanıtım.
 *
 * İki işi var: yeni açan biri oyunu anlasın (ilk açılışta bir kez
 * kendiliğinden çıkar), ve isteyen sonradan "?" ile açıp hangi
 * düğmenin ne yaptığına baksın. Dil sade, lise/ortaokul seviyesine
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
        <div className="mt-4 rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
          Kurallar: çıkarmada sonuç eksiye düşemez, bölme tam çıkmalı (kalan olmaz). Her taş bir kez kullanılır.
        </div>

        {/* Düğmeler ne işe yarar */}
        <h3 className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Düğmeler</h3>
        <ul className="mt-2 space-y-2">
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

        {/* Modlar */}
        <h3 className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Modlar</h3>
        <div className="mt-2 space-y-2 text-sm text-slate-300">
          <p>
            <b className="text-slate-100">Günün Turu:</b> Herkese aynı bulmaca, günde bir hak. Her gün oynadıkça serin
            büyür.
          </p>
          <p>
            <b className="text-slate-100">Antrenman:</b> İstediğin kadar oyna; süreyi ve büyük sayıları kendin ayarla.
          </p>
        </div>

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
