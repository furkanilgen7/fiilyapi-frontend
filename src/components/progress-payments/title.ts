import { formatPeriod } from "@/lib/format";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

/**
 * Satır başlığı (P7 T2 brief §Zorunlu eşlemeler): `#{sequence_no}` + dönem.
 * `period_year`/`period_month` ikisi de null ise dönem BASILMAZ, yalnız `#N`
 * kalır — sahte/varsayılan dönem uydurulmaz.
 */
export function formatPaymentTitle(
  item: Pick<ProgressPaymentListItem, "sequence_no" | "period_year" | "period_month">,
): string {
  const base = `#${item.sequence_no}`;
  if (item.period_year === null || item.period_month === null) return base;
  return `${base} — ${formatPeriod(item.period_year, item.period_month)}`;
}
