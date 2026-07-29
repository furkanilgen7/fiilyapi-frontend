/**
 * Proje formu türevleri — saf, DOM'suz fonksiyonlar (spec §4.5, §4.8).
 *
 * Süre uç-dahildir (ürün sahibi kararı 1): `end − start + 1`. Kâr marjı yalnız
 * sözleşme bedeli > 0 iken hesaplanır; aksi halde `null` (UI `—` basar).
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
 * Sözleşme süresi (gün), uç-dahil: `end − start + 1`.
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

export interface BudgetLines {
  material: number;
  labor: number;
  subcontractor: number;
  overhead: number;
}

/** Kuruş (2 ondalık) hassasiyetine yuvarlar; float birikimini engeller. */
function roundKurus(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Dört bütçe kaleminin toplamı. */
export function totalBudget(lines: BudgetLines): number {
  return roundKurus(
    lines.material + lines.labor + lines.subcontractor + lines.overhead,
  );
}

export interface ProfitMarginResult {
  totalBudget: number;
  profit: number;
  /** Yüzde (biçimlenmemiş). Sözleşme bedeli > 0 değilse null. */
  marginPct: number | null;
}

/**
 * Tahmini kâr marjı türevi.
 * `profit = contractAmount − totalBudget`,
 * `marginPct = contractAmount > 0 ? profit / contractAmount × 100 : null`.
 */
export function profitMargin(
  contractAmount: number | null | undefined,
  lines: BudgetLines,
): ProfitMarginResult {
  const total = totalBudget(lines);
  const amount = contractAmount ?? 0;
  const profit = roundKurus(amount - total);
  const marginPct = amount > 0 ? (profit / amount) * 100 : null;
  return { totalBudget: total, profit, marginPct };
}
