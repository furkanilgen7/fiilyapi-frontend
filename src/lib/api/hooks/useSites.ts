import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// Task 5 — Proje Detay › Şantiyeler listesi (spec §4.3). Tip adı "SiteCard" bilesen
// adiyla catisir, bu yuzden "SiteListItem" olarak takma ad verildi.
export type SiteListResponse = components["schemas"]["SiteListResponse"];
export type SiteListItem = components["schemas"]["SiteCard"];

export const SITES_QUERY_KEY = "sites";

export function useSites(projectId: string): UseQueryResult<SiteListResponse, Error> {
  return useQuery({
    queryKey: [SITES_QUERY_KEY, projectId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects/{project_id}/sites", {
          params: { path: { project_id: projectId } },
        }),
      ),
  });
}
