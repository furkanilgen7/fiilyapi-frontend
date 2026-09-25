/**
 * PLN-F2.3 · Başlık eki — İ:113 "… · Gün 142 · H21" (`headerSuffix`). Gün ve
 * hafta no backend'in takviminden (`days/{day}.day_no` / `week_no`, K23);
 * takvim dışı günde `null` gelir, ek basılmaz.
 */
export function formatDayWeek(dayNo: number | null, weekNo: number | null): string | null {
  const parts = [dayNo === null ? null : `Gün ${dayNo}`, weekNo === null ? null : `H${weekNo}`].filter(
    (part): part is string => part !== null,
  );
  return parts.length === 0 ? null : parts.join(" · ");
}
