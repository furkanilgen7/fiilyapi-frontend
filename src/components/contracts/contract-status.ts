import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { ContractStatus } from "@/lib/api/hooks/useContracts";

/**
 * SZL durum rozetleri — etiket + ton mockup'tan BİREBİR:
 * - 61  "Aktif"        `#dcfce7`/`#16a34a` → `success`
 * - 71  "Tamamlandı"   `#f1f5f9`/`#64748b` → `neutral`
 * - 91  "Beklemede"    `#fef3c7`/`#d97706` → `warning` (+ `szl-badge--on-hold`
 *       metin tonu düzeltmesi: primitive `--color-warning` #f59e0b basar,
 *       mockup 91 ondan KOYU olan `--color-warning-strong` #d97706'yı ister)
 *
 * Enum üç değerlidir (`ContractStatus`), üçünün de karşılığı mockup'ta VAR —
 * zarif düşüş gerekmez.
 */
export const CONTRACT_STATUS_BADGE: Record<
  ContractStatus,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Aktif", variant: "success" },
  completed: { label: "Tamamlandı", variant: "neutral" },
  on_hold: { label: "Beklemede", variant: "warning" },
};
