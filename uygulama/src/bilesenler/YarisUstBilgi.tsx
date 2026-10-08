/**
 * YarisUstBilgi.tsx — Düello ve arenanın tahta ÜSTÜ.
 *
 * NEDEN AYRI BİLEŞEN
 * Tur sayacı, rakip kartı, yarışçı listesi ve süre çubuğu oyundan
 * bağımsız: sayı turunda da kelime turunda da aynı. Bunlar `Oyun.tsx`
 * içinde, sayı tahtasıyla iç içeydi; kelime turu düelloya girerken ya
 * kopyalanacaklardı ya da buraya çıkarılacaklardı. Kopya, bir
 * düzeltmenin ikisinden birinde unutulması demek.
 *
 * KURAL 8 BURADA DA GEÇERLİ
 * Rakipten yayınlanan TEK bilgi uzaklık. Hangi taşı kullandığı, hangi
 * harfi seçtiği buraya hiç gelmiyor.
 */

export interface DuelloUstBilgi {
  turNo: number;
  toplamTur: number;
  skorBen: number;
  skorRakip: number;
  rakipAd: string;
  rakipElo?: number | null;
  rakipGalibiyet?: number | null;
  rakipUzaklik: number | null;
}

export interface ArenaUstBilgi {
  turNo: number;
  toplamTur: number;
  yarisanlar: {
    koltuk: number;
    ad: string;
    botMu: boolean;
    benMiyim: boolean;
    puan: number;
    ayrildi: boolean;
    uzaklik: number | null;
  }[];
}

interface Props {
  duello?: DuelloUstBilgi | null;
  arena?: ArenaUstBilgi | null;
  /** Antrenman oturumu göstergesi — yalnızca tek kişilik oyunda. */
  oturumPuan?: { toplamPuan: number; turSayisi: number } | null;
  mod?: string;
}

export default function YarisUstBilgi({ duello, arena, oturumPuan, mod }: Props) {
  return (
    <>
    <div className="flex items-center justify-between pr-14">
      {arena ? (
        <div className="text-xs font-bold text-slate-400" data-alan="arena-gostergesi">
          ⚡ Arena · Tur {arena.turNo}/{arena.toplamTur}
        </div>
      ) : duello ? (
        <div className="text-xs font-bold text-slate-400" data-alan="duello-gostergesi">
          Tur {duello.turNo}/{duello.toplamTur} ·{' '}
          <span className="text-cyan-300">{duello.skorBen}</span>
          <span className="text-slate-600"> — </span>
          <span className="text-slate-300">{duello.skorRakip}</span>
        </div>
      ) : mod === 'antrenman' && oturumPuan ? (
        <div className="text-xs font-bold text-slate-500" data-alan="oturum-gostergesi">
          Oturum: <span className="text-slate-300">{oturumPuan.toplamPuan} puan</span> ·{' '}
          {oturumPuan.turSayisi + 1}. tur
        </div>
      ) : (
        <span />
      )}
    </div>

    {/* RAKİP KARTI
        Canlı yayınlanan TEK bilgi uzaklık (kural 8); hangi taşı
        kullandığı, kaç adım attığı asla gelmez.

        Önce tek satırdı ve hamburger menü metni kesiyordu. Artık
        iki satırlı bir kart: üstte baş harf dairesi, ad ve güç;
        altta durum — kesilmeden sığıyor. */}
    {duello && (
      <div
        className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5"
        data-alan="rakip-durumu"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-black text-slate-200"
          >
            {duello.rakipAd.trim().charAt(0).toLocaleUpperCase('tr')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-200" data-alan="rakip-ad">
              {duello.rakipAd}
            </div>
            {duello.rakipElo != null && (
              <div className="text-[11px] text-slate-500" data-alan="rakip-guc">
                {duello.rakipElo} puan
                {duello.rakipGalibiyet != null && ` · ${duello.rakipGalibiyet} galibiyet`}
              </div>
            )}
          </div>
        </div>
        <div className="mt-1.5 text-xs font-bold" data-alan="rakip-uzaklik">
          {duello.rakipUzaklik == null ? (
            <span className="text-slate-500">Henüz bir şey bulamadı</span>
          ) : duello.rakipUzaklik === 0 ? (
            <span className="text-amber-300">Tam isabet yaptı 🎯</span>
          ) : (
            <span className="text-slate-300">Hedefe {duello.rakipUzaklik} kaldı</span>
          )}
        </div>
      </div>
    )}

    {/* ARENA — beş yarışçının canlı durumu.
        Yayınlanan tek bilgi uzaklık (kural 8); kimin hangi taşı
        kullandığı asla gelmez. Sıralama anlık uzaklığa göre: kim
        önde, bir bakışta görünsün. */}
    {arena && (
      <div
        className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2"
        data-alan="arena-yarisanlar"
      >
        <ul className="space-y-1.5">
          {[...arena.yarisanlar]
            .sort((a, b) => {
              if (a.ayrildi !== b.ayrildi) return a.ayrildi ? 1 : -1;
              const ua = a.uzaklik ?? Infinity;
              const ub = b.uzaklik ?? Infinity;
              if (ua !== ub) return ua - ub;
              return a.koltuk - b.koltuk;
            })
            .map((y) => (
              <li
                key={y.koltuk}
                data-alan="arena-yarisci"
                data-ben={y.benMiyim ? '1' : undefined}
                className={`flex items-center gap-2 text-xs ${
                  y.ayrildi ? 'opacity-40' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    y.benMiyim ? 'bg-cyan-300/25 text-cyan-100' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {y.ad.trim().charAt(0).toLocaleUpperCase('tr')}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-bold ${
                    y.benMiyim ? 'text-cyan-200' : 'text-slate-300'
                  }`}
                >
                  {y.benMiyim ? 'Sen' : y.ad}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">{y.puan} puan</span>
                <span className="w-24 shrink-0 text-right font-bold">
                  {y.ayrildi ? (
                    <span className="text-slate-600">çıktı</span>
                  ) : y.uzaklik == null ? (
                    <span className="text-slate-600">—</span>
                  ) : y.uzaklik === 0 ? (
                    <span className="text-amber-300">tam isabet</span>
                  ) : (
                    <span className="text-slate-300">{y.uzaklik} fark</span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      </div>
    )}
    </>
  );
}

/** Süre çubuğu — her oyunda aynı. */
export function SureCubugu({
  kalan,
  toplamSure,
}: {
  kalan: number;
  toplamSure: number;
}) {
  const sureYuzde = toplamSure > 0 ? Math.max(0, (kalan / toplamSure) * 100) : 100;
  return (
    <>
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
          sureYuzde < 25 ? 'bg-amber-400' : 'bg-cyan-300'
        }`}
        style={{ width: `${sureYuzde}%` }}
        data-alan="sure-cubuk"
      />
    </div>
    <div className="mt-1 text-right text-[11px] text-slate-500" data-alan="sure-kalan" data-toplam-sure={toplamSure}>
      {toplamSure > 0 ? `${kalan} sn` : 'süresiz'}
    </div>
    </>
  );
}
