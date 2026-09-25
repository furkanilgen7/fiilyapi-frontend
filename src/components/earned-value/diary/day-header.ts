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

/**
 * F2.6 · Tablet şeridi — İ:529 "24.09 · A-Blok": `YYYY-MM-DD` → "dd.mm".
 * `new Date(iso)` KULLANILMAZ (UTC yorumlanır, TR saatinde gün kayar —
 * `formatDateDots` ile aynı gerekçe); ayrıştırılamayan girdi aynen döner.
 */
export function formatDayDots(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (year === undefined || month === undefined || day === undefined) return iso;
  return `${day}.${month}`;
}
