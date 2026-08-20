/**
 * GizlilikAyarlari.tsx — kullanıcının veri toplamayı kapatabildiği ekran.
 *
 * Gizlilik metninde "bu ayarları uygulamadan değiştirebilirsiniz" yazıyor;
 * burası onun karşılığı. Metinde söz verilen her şeyin gerçekten
 * yapılabilir olması gerekir.
 *
 * Tercihler localStorage'da tutulur ve açılışta Firebase'e uygulanır.
 * Web'de bu ekran zaten toplama olmadığını söyler.
 */

import { useEffect, useState } from 'react';
import SayfaSablonu from './SayfaSablonu';
import { nativeMi } from '../platform';
import {
  analyticsAyarla,
  crashlyticsAyarla,
  bildirimIzniIste,
  bildirimIzniVarMi,
  bildirimiKapat,
} from '../firebase';

const ANAHTAR = 'zt-gizlilik';

interface Tercihler {
  analytics: boolean;
  crashlytics: boolean;
}

/** Varsayılan: çökme raporu açık, kullanım olayları KAPALI. */
const VARSAYILAN: Tercihler = { analytics: false, crashlytics: true };

export function tercihleriOku(): Tercihler {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return VARSAYILAN;
    return { ...VARSAYILAN, ...(JSON.parse(ham) as Partial<Tercihler>) };
  } catch {
    return VARSAYILAN;
  }
}

function tercihleriYaz(t: Tercihler): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(t));
  } catch {
    // Depo yazılamıyorsa tercih oturumluk kalır; oyun etkilenmez.
  }
}

/** Açılışta çağrılır: kayıtlı tercihleri Firebase'e uygular. */
export async function tercihleriUygula(): Promise<void> {
  const t = tercihleriOku();
  await analyticsAyarla(t.analytics);
  await crashlyticsAyarla(t.crashlytics);
}

export default function GizlilikAyarlari({ onGeri }: { onGeri?: () => void }) {
  const [tercih, setTercih] = useState<Tercihler>(tercihleriOku);
  const [bildirim, setBildirim] = useState(false);

  useEffect(() => {
    bildirimIzniVarMi().then(setBildirim);
  }, []);

  function degistir(alan: keyof Tercihler, deger: boolean) {
    const yeni = { ...tercih, [alan]: deger };
    setTercih(yeni);
    tercihleriYaz(yeni);
    if (alan === 'analytics') analyticsAyarla(deger);
    if (alan === 'crashlytics') crashlyticsAyarla(deger);
  }

  async function bildirimDegistir(deger: boolean) {
    if (deger) {
      const jeton = await bildirimIzniIste();
      setBildirim(jeton !== null);
    } else {
      await bildirimiKapat();
      setBildirim(false);
    }
  }

  return (
    <SayfaSablonu
      baslik="Gizlilik Ayarları"
      alt="Hangi verilerin toplanacağına sen karar ver"
      onGeri={onGeri}
      cocuklar={
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          {!nativeMi() && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-400">
              Tarayıcıdan oynuyorsun. Bu sürümde çökme raporu, kullanım olayı veya
              bildirim <strong>hiç toplanmıyor</strong> — aşağıdaki ayarlar yalnızca
              Android uygulamasında geçerli.
            </div>
          )}

          <Anahtar
            baslik="Günlük hatırlatma"
            aciklama="Her gün yeni tur hazır olduğunda bildirim gönderilir. İstemezsen hiç gönderilmez."
            acik={bildirim}
            onDegis={bildirimDegistir}
          />

          <Anahtar
            baslik="Çökme raporları"
            aciklama="Uygulama çökerse hata izi, cihaz modeli ve Android sürümü gönderilir. Kim olduğun gönderilmez. Hataları bulmamıza yardım eder."
            acik={tercih.crashlytics}
            onDegis={(d) => degistir('crashlytics', d)}
          />

          <Anahtar
            baslik="Kullanım olayları"
            aciklama="Hangi ekranın açıldığı, turun bitip bitmediği gibi oyun olayları gönderilir. E-posta, kullanıcı adı veya oyuncu kimliği gönderilmez."
            acik={tercih.analytics}
            onDegis={(d) => degistir('analytics', d)}
          />

          <div className="mt-8 border-t border-slate-800 pt-6 text-xs text-slate-500">
            <p className="mb-2">
              <strong className="text-slate-400">Reklamlar hakkında:</strong> Android
              uygulamasında reklam gösterilir ve bu kapatılamaz. Ancak uygulama
              çocuklara yönelik olduğu için reklamlar kişiselleştirilmez; reklam
              kimliğin toplanmaz ve davranışsal profil çıkarılmaz.
            </p>
            <p>
              Verilerinin tamamını silmek istersen menüdeki "Hesabımı sil"
              seçeneğini kullanabilirsin.
            </p>
          </div>
        </div>
      }
    />
  );
}

/* ── Tek bir açma/kapama satırı ── */
function Anahtar({
  baslik,
  aciklama,
  acik,
  onDegis,
}: {
  baslik: string;
  aciklama: string;
  acik: boolean;
  onDegis: (deger: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <input
        type="checkbox"
        checked={acik}
        onChange={(e) => onDegis(e.target.checked)}
        className="mt-1 accent-cyan-400"
      />
      <span>
        <span className="block font-bold text-slate-200">{baslik}</span>
        <span className="mt-1 block text-xs text-slate-400">{aciklama}</span>
      </span>
    </label>
  );
}
