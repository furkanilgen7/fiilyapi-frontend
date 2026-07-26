const LOCALE = "tr-TR";
const MILLION = 1_000_000;
const THOUSAND = 1_000;

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

/** Sondaki sifirlari atarak en fazla bir ondalik basar: 1,5 · 8 · 42,5 */
function short(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value);
}

/** Kart tutarlari: mockup'taki "₺ 8,4M" gosterimi. */
export function formatCompactCurrency(value: string | number): string {
  const n = toNumber(value);
  if (Math.abs(n) >= MILLION) return `₺ ${short(n / MILLION)}M`;
  if (Math.abs(n) >= THOUSAND) return `₺ ${short(n / THOUSAND)}B`;
  return `₺ ${short(n)}`;
}

/** Portfoy tutari: mockup'taki "24.870.500" gosterimi. */
export function formatCurrency(value: string | number): string {
  const formatted = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(
    toNumber(value),
  );
  return `₺ ${formatted}`;
}

/** Ilerleme yuzdesi: "%42,5" · "%75" */
export function formatPercent(value: string | number): string {
  return `%${short(toNumber(value))}`;
}

/** Kart tarihleri: mockup'taki "Mar 2025" gosterimi. */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
