import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import {
  partitionSitePayments as partitionSitePaymentsGeneric,
  projectWideNote,
  type SitePaymentScopePartition as SitePaymentScopePartitionGeneric,
} from "@/lib/site-payment-scope";

/**
 * KAYIT 454: saf mantık `@/lib/site-payment-scope`e taşındı (döngüsel
 * bağımlılık — bkz. o dosyanın başlığı). Bu dosya artık yalnız
 * `SiteSubcontractorPaymentItem` KONKRE tipine bağlanmış ince bir cephedir;
 * mevcut çağıranlar (`SiteSubcontractorPaymentsPanel.tsx`,
 * `site-payment-scope.test.ts`) değişmeden çalışmaya devam eder.
 */
export type SitePaymentScopePartition = SitePaymentScopePartitionGeneric<SiteSubcontractorPaymentItem>;

export function partitionSitePayments(
  items: readonly SiteSubcontractorPaymentItem[],
): SitePaymentScopePartition {
  return partitionSitePaymentsGeneric(items);
}

export { projectWideNote };
