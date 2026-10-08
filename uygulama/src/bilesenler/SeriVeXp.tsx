/**
 * SeriVeXp.tsx — Seri şeridi ve XP kartı.
 *
 * NEDEN AYRI BİLEŞEN
 * Oyuncunun "nerede duruyorum" bilgisi ana ekranda vardı ama Kelime
 * Turu'nda yoktu; aynı uygulamanın iki ekranı iki farklı dünya gibi
 * duruyordu. Kopyalamak yerine tek bileşen.
 *
 * Seri tek sayaç: hangi oyun oynanırsa oynansın "bugün oynadı"
 * sayılıyor (bkz. CLAUDE.md, lig bölümü).
 */

import { useEffect, useMemo, useState } from 'react';
import { bugun, oku, serit } from '../depo';
import { ilerlemeOku, xpSeviyeHesapla, type OyuncuIlerleme } from '../kimlik';

interface Props {
  kullanici?: { ad: string; id?: string } | null;
  onGirisAc?: () => void;
}

export default function SeriVeXp({ kullanici, onGirisAc }: Props) {
  const [ilerleme, setIlerleme] = useState<OyuncuIlerleme | null>(null);

  useEffect(() => {
    if (kullanici?.id) ilerlemeOku(kullanici.id).then(setIlerleme);
    else setIlerleme(null);
  }, [kullanici?.id]);

  const gun = bugun();
  const il = oku();
  const seritler = useMemo(() => serit(gun, 28, il), [gun, il]);
  const seri = il.seri.gun;

  return (
    <>
      {/* SERİ ALTIN RENGİNDE: kesintisiz oynamak bir ödül, bir eylem
          değil. Marka cyan'ı düğmelere ve vurguya ayrıldı. */}
      <div
        className={`mt-6 rounded-xl border p-4 ${
          seri > 0 ? 'zt-odul-yuzey' : 'border-slate-800 bg-slate-900/40'
        }`}
        data-alan="seri"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Kesintisiz seri:{' '}
            <span className="zt-odul-yazi font-bold" data-alan="seri-gun">
              {seri}
            </span>{' '}
            gün
          </div>
          <div className="text-xs text-slate-500">Son 28 gün</div>
        </div>
        <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1" aria-hidden="true">
          {seritler.map((g) => (
            <span
              key={g.tarih}
              title={g.tarih}
              className={`h-3.5 rounded-sm ${
                g.durum === 'tam'
                  ? 'zt-odul-kare'
                  : g.durum === 'yakin'
                    ? 'zt-odul-kare-soluk'
                    : g.durum === 'uzak'
                      ? 'bg-slate-600'
                      : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
        {!kullanici && (
          <button
            onClick={() => onGirisAc?.()}
            data-alan="seri-misafir-notu"
            className="zt-dokunma-alani mt-3 block w-full text-left text-[11px] text-amber-300/80 hover:text-amber-200"
          >
            {seri > 0
              ? `${seri} günlük serin kaydedilmiyor — üye ol.`
              : 'Serin kaydedilmiyor — üye ol.'}
          </button>
        )}
      </div>

      {/* XP SEVİYESİ MOR: nadir olanın rengi. Seri (altın) ile XP (mor)
          artık bakışta ayrılıyor; ikisi de cyan'ken aynı şey sanılıyordu. */}
      {kullanici?.id && ilerleme && (
        <div className="zt-nadir-yuzey mt-4 rounded-xl border p-4" data-alan="xp">
          {(() => {
            const sv = xpSeviyeHesapla(ilerleme.xp);
            return (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="zt-nadir-yazi text-sm font-bold">
                    Lv.{sv.seviye} {sv.unvan}
                  </span>
                  <span className="text-xs text-slate-500">{ilerleme.xp} XP</span>
                </div>
                {sv.sonrakiXp && (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="zt-nadir-dolgu h-full rounded-full transition-all"
                      style={{ width: `${sv.ilerlemeYuzdesi}%` }}
                    />
                  </div>
                )}
                {sv.sonrakiXp && (
                  <div className="mt-1 text-[11px] text-slate-600">
                    Sonraki seviye: {sv.sonrakiXp} XP
                  </div>
                )}
                {ilerleme.seriGun > 0 && (
                  <div className="zt-odul-yazi mt-2 text-xs">{ilerleme.seriGun} gün seri</div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
