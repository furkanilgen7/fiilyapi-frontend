import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-ST T1 · Şantiye Stok sekmesi (ŞS) — `GET /sites/{site_id}/stock`.
//
// ⚠️ BFF: bu uç `stock` kökünden DEĞİL, ilk segmenti "sites" olduğu için
// MEVCUT `sites` kökünden geçer (bkz. route.ts F-ST notu).
//
// `balance` YALNIZ o şantiyenin depolarını kapsar; merkez depo (`site_id IS
// NULL`) hiçbir şantiyenin bakiyesine girmez (backend spec §3).
export type SiteStockResponse = components["schemas"]["SiteStockResponse"];
export type SiteStockRow = components["schemas"]["SiteStockRow"];
export type SiteStockKpis = components["schemas"]["SiteStockKpis"];

export const SITE_STOCK_QUERY_KEY = "site-stock";

/**
 * Sayfalama DIŞINDA süzgeç YOKTUR (openapi.json): kategori/arama/durum
 * parametreleri bu uçta bilerek açılmamıştır — ŞS mockup'ında süzgeç şeridi
 * yok. Uydurma parametre gönderilmez.
 */
export interface SiteStockFilter {
  limit?: number;
  offset?: number;
}

export function useSiteStock(
  siteId: string,
  filter: SiteStockFilter = {},
): UseQueryResult<SiteStockResponse, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [SITE_STOCK_QUERY_KEY, siteId, filter.limit ?? null, filter.offset ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/stock", {
          params: {
            path: { site_id: siteId },
            query: {
              ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
              ...(filter.offset !== undefined ? { offset: filter.offset } : {}),
            },
          },
        }),
      ),
  });
}
