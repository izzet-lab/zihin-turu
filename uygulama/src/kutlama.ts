/**
 * kutlama.ts — İlerleme fotoğrafını okur, saklar, kutlamayı tetikler.
 *
 * NASIL ÇALIŞIYOR
 * Her tur sunucuya işlendikten sonra oyuncunun XP'si, serisi ve
 * rozetleri yeniden okunuyor; bir önceki fotoğrafla karşılaştırılıp
 * (bkz. `kutlama-karar.ts`) kutlanacaklar bulunuyor. Yeni fotoğraf
 * tarayıcıya yazılıyor ki aynı rozet ikinci kez kutlanmasın.
 *
 * NEDEN SUNUCUDAN OKUNUYOR
 * XP'yi de rozeti de sunucu veriyor (kural 2). İstemcinin kendi
 * hesabına güvenseydik, "seviye atladın" diyen ama sunucuda karşılığı
 * olmayan bir kutlama çıkardı.
 *
 * NEDEN KÜÇÜK BİR OLAY YAYINI
 * Tur birkaç ayrı ekranda bitiyor: tek kişilik sonuç, kelime sonucu,
 * düello, arena. Hepsine ayrı ayrı kutlama katmanı koymak yerine
 * katman bir kez en üstte duruyor ve bu olayı dinliyor.
 */

import { supabase } from './supabase';
import { ilerlemeOku } from './kimlik';
import { kutlamalariBul, type IlerlemeOzeti, type Kutlama } from './kutlama-karar';

const ANAHTAR = 'tamisabet.kutlama.v1';
const OLAY = 'tamisabet:kutlama';

function fotografOku(): IlerlemeOzeti | null {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? (JSON.parse(ham) as IlerlemeOzeti) : null;
  } catch {
    return null;
  }
}

function fotografYaz(o: IlerlemeOzeti): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(o));
  } catch {
    // Depo yazılamıyorsa kutlama bir daha çıkmaz; oyun etkilenmez.
  }
}

/** Oyuncunun o andaki XP, seri ve rozet durumu. */
export async function ilerlemeOzetiOku(oyuncuId: string): Promise<IlerlemeOzeti> {
  const [ilerleme, rozetler] = await Promise.all([
    ilerlemeOku(oyuncuId),
    supabase.from('rozet').select('rozet_kodu').eq('oyuncu_id', oyuncuId),
  ]);
  return {
    xp: ilerleme.xp,
    seriGun: ilerleme.seriGun,
    rozetler: (rozetler.data ?? []).map((r: { rozet_kodu: string }) => r.rozet_kodu),
  };
}

/**
 * Tur işlendikten sonra çağrılır: fark varsa kutlama olayını yayar.
 *
 * Sessizce başarısız olur — kutlama bir süs; ağ hatası yüzünden
 * oyuncunun akışı bozulmamalı.
 */
export async function kutlamayiDenetle(oyuncuId?: string): Promise<void> {
  try {
    // Kimlik verilmediyse oturumdan okunur: düello ve arena ekranları
    // oyuncunun kimliğini taşımıyor, yalnızca "giriş yapıldı mı"yı
    // biliyor.
    if (!oyuncuId) {
      const { data } = await supabase.auth.getSession();
      oyuncuId = data.session?.user.id;
    }
    if (!oyuncuId) return;

    const simdiki = await ilerlemeOzetiOku(oyuncuId);
    const onceki = fotografOku();
    fotografYaz(simdiki);

    const kutlamalar = kutlamalariBul(onceki, simdiki);
    if (kutlamalar.length === 0) return;
    window.dispatchEvent(new CustomEvent<Kutlama[]>(OLAY, { detail: kutlamalar }));
  } catch {
    // Ağ yoksa kutlama atlanır.
  }
}

/** Kutlama katmanı bunu dinliyor. */
export function kutlamaDinle(kanca: (k: Kutlama[]) => void): () => void {
  const el = (e: Event) => kanca((e as CustomEvent<Kutlama[]>).detail);
  window.addEventListener(OLAY, el);
  return () => window.removeEventListener(OLAY, el);
}

/**
 * Giriş yapıldığında ilk fotoğrafı sessizce alır.
 *
 * Olmasaydı, hesabına ilk kez giren oyuncuya o güne kadar kazandığı
 * bütün rozetler arka arkaya kutlanırdı.
 */
export async function ilkFotografiAl(oyuncuId: string | undefined): Promise<void> {
  if (!oyuncuId || fotografOku()) return;
  try {
    fotografYaz(await ilerlemeOzetiOku(oyuncuId));
  } catch {
    // Sonraki denemede alınır.
  }
}
