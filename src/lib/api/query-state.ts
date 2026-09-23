/**
 * "Veri YÜKLENDİ mi" sorusunun TEK ölçütü.
 *
 * 🔴 SINIF KUSURU (O5b onarımı — 2026-09-23): birden çok ekranda bu soru
 * bağımsız `!query.isLoading` kontrolleriyle cevaplanıyordu ve `isError`
 * unutuluyordu. Sorgu HATAYA düştüğünde `isLoading` de `false`e döner —
 * yani "yüklendi" sanılır ve fail-open bir sonuç ("Şantiye atanmadı" gibi
 * YANLIŞ bir olgu) görünür/GERÇEK basılır. İki ölçülmüş örnek:
 * `EquipmentFuelView.tsx` (`resolveSiteLabel`) ve `EquipmentWorkView.tsx`
 * (görsel e2e izi `makine-cal-loaded-sites`).
 *
 * Bu dosya "yüklendi" bayrağını TEK yerde tanımlar; yeni bir ekran aynı
 * soruyu tekrar kendi `!isLoading`iyle CEVAPLAMAMALIDIR.
 */
export interface QueryLikeState {
  isLoading: boolean;
  isError: boolean;
}

/** Veri GERÇEKTEN geldi mi (ne yükleniyor ne de hataya düşmüş). */
export function isLoaded(state: QueryLikeState): boolean {
  return !state.isLoading && !state.isError;
}

/**
 * Bir arama tablosundan (`Map`/lookup fonksiyonu) değer çözer; ÜÇ durumu
 * ayırt eder (kalan-4 #181 / EquipmentDetailView.tsx kanonu):
 *
 * - `id === null` ⇒ atama YOK, meşru bir durumdur ⇒ `null`
 * - kaynak henüz yüklenmedi VEYA hataya düştü ⇒ nötr `undefined` — çağıran
 *   YANLIŞ bir "yok/bulunamadı" BASMAZ, "Yükleniyor…" gibi nötr bir metin basar
 * - kaynak yüklendi ama `id` haritada yoksa ⇒ bulunamadı (`lookup` sonucu,
 *   varsayılan `null`)
 */
export function resolveLookup<T>(
  id: string | null,
  state: QueryLikeState,
  lookup: (id: string) => T | undefined,
): T | null | undefined {
  if (id === null) return null;
  if (!isLoaded(state)) return undefined;
  return lookup(id) ?? null;
}
