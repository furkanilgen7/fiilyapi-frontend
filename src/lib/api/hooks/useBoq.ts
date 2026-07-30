import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// Ekran 13 · Is Kalemleri (BOQ) — spec §6.2. Tipler `pnpm gen:api` ciktisindan
// takma ad olarak alinir; elle arayuz yazmak yasak.
export type BoqListResponse = components["schemas"]["BoqListResponse"];
export type BoqTotals = components["schemas"]["BoqTotals"];
export type BoqGroup = components["schemas"]["BoqGroupResponse"];
export type BoqItem = components["schemas"]["BoqItemResponse"];
export type BoqGroupCreate = components["schemas"]["BoqGroupCreate"];
export type BoqGroupUpdate = components["schemas"]["BoqGroupUpdate"];
export type BoqItemCreate = components["schemas"]["BoqItemCreate"];
export type BoqItemUpdate = components["schemas"]["BoqItemUpdate"];

export const BOQ_QUERY_KEY = "boq";

/**
 * Ekranin tek okuma sorgusu (spec §6.1): tablo VE ust KPI seridi ayni yanittan
 * gelir, bu yuzden tek anahtar yeterlidir.
 *
 * `siteId` bossa aga cikilmaz (useSite deseni): drill kabugu santiye seviyesinde
 * olmadiginda bu hook bos id ile cagrilir (hook'lar kosullu cagrilamaz).
 */
export function useBoq(siteId: string): UseQueryResult<BoqListResponse, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [BOQ_QUERY_KEY, siteId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/boq", {
          params: { path: { site_id: siteId } },
        }),
      ),
  });
}
