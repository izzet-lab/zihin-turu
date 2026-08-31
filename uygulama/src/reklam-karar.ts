/**
 * reklam-karar.ts — Reklam kişiselleştirme kararı, saf.
 *
 * NEDEN AYRI DOSYA
 * `reklam.ts` AdMob eklentisini içe aktarıyor ve Node'da yüklenmiyor;
 * karar orada kaldığı sürece test edilemiyordu. Oysa bu karar yasal
 * beyanın kendisi (CLAUDE.md kural 6) ve test edilmesi gereken ilk şey.
 *
 * Native katman yalnızca bu kararı uygular.
 */

/**
 * Kişiselleştirilmemiş reklam mı gösterilmeli?
 *
 * TEK KAYNAK. Banner ve ödüllü video AdMob'da AYRI çağrı yolları
 * kullanıyor; kararı iki yerde ayrı yazmak, birinin güncellenip
 * diğerinin unutulması demekti — CLAUDE.md'nin özellikle uyardığı yer.
 *
 * İki koşuldan biri yeterli:
 *   - kullanıcı 18 yaşından küçükse (yaşından bağımsız olarak onay da
 *     sorulmaz),
 *   - ya da kişiselleştirme onayı alınmamışsa.
 *
 * Belirsizlikte güvenli taraf seçilir: yaş bilinmiyorsa ve onay yoksa
 * yine kişiselleştirilmemiş reklam gösterilir.
 */
export function npaKarari(resitDegilMi: boolean, kisiselOnayVar: boolean): boolean {
  return resitDegilMi || !kisiselOnayVar;
}
