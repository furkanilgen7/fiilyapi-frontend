import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// Task 5 — Proje Detay › Şantiyeler listesi (spec §4.3). Tip adı "SiteCard" bilesen
// adiyla catisir, bu yuzden "SiteListItem" olarak takma ad verildi.
export type SiteListResponse = components["schemas"]["SiteListResponse"];
export type SiteListItem = components["schemas"]["SiteCard"];
// Task 8 — Şantiye Detay tekil kaynağı (spec §5). Bileşen adıyla çakışmasın
// diye "SiteDetail" (SiteCard deseniyle aynı) takma adı verildi.
export type SiteDetail = components["schemas"]["SiteDetailResponse"];

export const SITES_QUERY_KEY = "sites";
export const SITE_QUERY_KEY = "site";

/**
 * Sorgu seçenekleri AYRI dışa verilir: E5 puantajının şantiye seçicisi aynı
 * anahtarları `useQueries` ile paralel çeker (`useRolePermissions` deseni) —
 * önbellek `useSites` ile PAYLAŞILIR, ikinci bir istek doğmaz.
 */
export function sitesQueryOptions(projectId: string) {
  return {
    queryKey: [SITES_QUERY_KEY, projectId],
    queryFn: async (): Promise<SiteListResponse> =>
      unwrap(
        await backendClient.GET("/projects/{project_id}/sites", {
          params: { path: { project_id: projectId } },
        }),
      ),
  };
}

export function useSites(projectId: string): UseQueryResult<SiteListResponse, Error> {
  return useQuery(sitesQueryOptions(projectId));
}

// Şantiye Detay hero + sekmeler + bölüm listesi için tekil şantiye (spec §5).
// `siteId` boşsa sorgu çalışmaz: drill kabuğu (proje layout'u) şantiye
// seviyesinde olmadığında bu hook'u boş id ile çağırır (hook'lar koşullu
// çağrılamaz), ağa çıkmamalıdır.
export function useSite(siteId: string): UseQueryResult<SiteDetail, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [SITE_QUERY_KEY, siteId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}", {
          params: { path: { site_id: siteId } },
        }),
      ),
  });
}
