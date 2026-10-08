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
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="seri">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Kesintisiz seri:{' '}
            <span className="font-bold text-cyan-300" data-alan="seri-gun">
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
                  ? 'bg-cyan-300'
                  : g.durum === 'yakin'
                    ? 'bg-cyan-300/40'
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

      {kullanici?.id && ilerleme && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="xp">
          {(() => {
            const sv = xpSeviyeHesapla(ilerleme.xp);
            return (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-300">
                    Lv.{sv.seviye} {sv.unvan}
                  </span>
                  <span className="text-xs text-slate-500">{ilerleme.xp} XP</span>
                </div>
                {sv.sonrakiXp && (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all"
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
                  <div className="mt-2 text-xs text-slate-400">🔥 {ilerleme.seriGun} gün seri</div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
