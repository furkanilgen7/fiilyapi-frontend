/**
 * Proje formuna özgü türevler — saf, DOM'suz fonksiyonlar (spec §4.5, §4.8).
 *
 * `durationDays` iki formun da paylaştığı ortak türevdir; T1'de
 * `@/lib/form/derive`e taşındı ve davranışı birebir korunarak buradan yeniden
 * dışa aktarılır (P1.1a çağrı noktaları değişmez). Kâr marjı yalnız sözleşme
 * bedeli > 0 iken hesaplanır; aksi halde `null` (UI `—` basar).
 */

export { durationDays } from "@/lib/form/derive";

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
