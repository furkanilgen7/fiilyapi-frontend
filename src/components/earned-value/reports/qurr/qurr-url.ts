/**
 * PLN-F3.5 · `?hafta=` URL durumu ("Bütçe `useBudgetScreenHooks` deseni" —
 * `budget-url.ts`in AYNI şekli, tek param).
 * Yoksa/geçersizse `null` — `useWeeklyReport(siteId, null)` backend'in
 * bugünün haftasına düşmesini sağlar (URL "haftasız" kalır).
 */
export const WEEK_PARAM = "hafta";

export function parseWeekParam(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** `?site=` gibi diğer parametreleri KORUR — yalnız `hafta`yı değiştirir/siler. */
export function nextWeekSearch(current: URLSearchParams, week: number | null): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  if (week === null) params.delete(WEEK_PARAM);
  else params.set(WEEK_PARAM, String(week));
  return params;
}
