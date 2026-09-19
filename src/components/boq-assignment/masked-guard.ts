/**
 * Bölüm tahsisi ekranının kapsam maskesi sınırı.
 *
 * Kural ve gerekçe TEK KAYNAKTADIR: `@/lib/masked`. Burada yalnız bu ekranın
 * kendi türevi (`siteQuotaOf`) sarmalanır — kural ikinci kez YAZILMAZ.
 */
import { siteQuotaOf } from "@/lib/boq-quota";
import { maskesiz } from "@/lib/masked";

export { maskesiz };

/** Şantiye kotası — aynı sınır kuralıyla. */
export function maskesizKota(item: {
  readonly allocated_quantity: string | null;
  readonly unallocated_quantity: string | null;
}): string {
  return maskesiz(siteQuotaOf(item), "siteQuota");
}
