/**
 * Form türevleri — saf, DOM'suz fonksiyonlar. Birden fazla formun paylaştığı
 * mantık burada durur (proje formu §4.5/§4.8, şantiye formu §8.2).
 *
 * Süre uç-dahildir (ürün sahibi kararı 1): `end − start + 1`.
 */

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" girişini UTC gün başlangıcı epoch ms'ine çevirir; geçersizse null. */
function parseIsoDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  // Ay/gün taşmasını (or. 2025-02-30) reddet.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

/**
 * Süre (gün), uç-dahil: `end − start + 1`.
 * Tarihlerden biri boş/geçersiz veya bitiş başlangıçtan önceyse `null`.
 */
export function durationDays(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const s = parseIsoDay(start);
  const e = parseIsoDay(end);
  if (s === null || e === null) return null;
  const days = Math.round((e - s) / MS_PER_DAY) + 1;
  return days > 0 ? days : null;
}
