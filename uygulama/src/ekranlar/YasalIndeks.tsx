/**
 * YasalIndeks.tsx — Gizlilik ve yasal metinlerin tek giriş noktası.
 *
 * NEDEN VAR
 * Bu bağlantılar önceden Kurulum ve Sonuç ekranlarının alt bilgisinde
 * duruyordu; giriş yapan kullanıcı için profile de taşınmıştı ama eski
 * yerlerinden silinmemişti — aynı bağlantılar iki yerde yaşıyordu.
 *
 * Alt bilgiler kaldırıldı. Giriş yapan kullanıcı bunlara profilinden
 * ulaşıyor; MİSAFİRİN profili olmadığı için (profil sayfası bir
 * kullanıcı adı ister) menüdeki "Gizlilik ve yasal" bu sayfaya getirir.
 * Böylece KVKK metnine her kullanıcı ulaşabiliyor — hem yasal
 * zorunluluk hem Play Store şartı.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import SayfaSablonu from './SayfaSablonu';

interface Satir {
  yol: string;
  ad: string;
  aciklama: string;
  simge: string;
  yalnizcaUye?: boolean;
  tehlikeli?: boolean;
}

const SATIRLAR: Satir[] = [
  {
    yol: '/gizlilik-ayarlari',
    ad: 'Gizlilik ayarları',
    aciklama: 'Analitik, çökme raporu, bildirim ve reklam onayı',
    simge: '⚙️',
  },
  {
    yol: '/yasal/kvkk',
    ad: 'KVKK Aydınlatma Metni',
    aciklama: 'Hangi veriyi neden topluyoruz',
    simge: '📄',
  },
  {
    yol: '/yasal/gizlilik',
    ad: 'Gizlilik Politikası',
    aciklama: 'Verinin nasıl saklandığı ve korunduğu',
    simge: '🔒',
  },
  {
    yol: '/yasal/cerez',
    ad: 'Çerez Politikası',
    aciklama: 'Tarayıcıda ve cihazda saklananlar',
    simge: '🍪',
  },
  {
    yol: '/yasal/kullanim-kosullari',
    ad: 'Kullanım Koşulları',
    aciklama: 'Oyunu kullanma şartları',
    simge: '📋',
  },
  {
    yol: '/yasal/hesap-sil',
    ad: 'Hesabı sil',
    aciklama: 'Hesabın ve tüm verin kalıcı olarak silinir',
    simge: '🗑️',
    yalnizcaUye: true,
    tehlikeli: true,
  },
];

interface Props {
  onGeri?: () => void;
}

export default function YasalIndeks({ onGeri }: Props) {
  const gecis = useNavigate();
  const [uyeMi, setUyeMi] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUyeMi(!!data.session));
  }, []);

  const gorunen = SATIRLAR.filter((s) => !s.yalnizcaUye || uyeMi);

  return (
    <SayfaSablonu
      baslik="Gizlilik ve yasal"
      alt="Verinle ilgili her şey burada."
      onGeri={onGeri}
      cocuklar={
        <div className="not-prose space-y-2" data-alan="yasal-liste">
          {gorunen.map((s) => (
            <button
              key={s.yol}
              onClick={() => gecis(s.yol)}
              data-alan={`yasal-${s.yol.split('/').pop()}`}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                s.tehlikeli
                  ? 'border-red-900/50 bg-red-950/20 hover:bg-red-950/40'
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/60'
              }`}
              style={{ minHeight: 64 }}
            >
              <span className="text-xl" aria-hidden="true">
                {s.simge}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-bold ${s.tehlikeli ? 'text-red-300' : 'text-slate-100'}`}
                >
                  {s.ad}
                </span>
                <span className="block text-xs text-slate-500">{s.aciklama}</span>
              </span>
            </button>
          ))}
        </div>
      }
    />
  );
}
