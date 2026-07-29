import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { SITES_QUERY_KEY, type SiteListItem } from "./useSites";
import { PROJECT_QUERY_KEY } from "./useProjects";

export type SiteCreateRequest = components["schemas"]["SiteCreate"];

// Task 7 — SiteFormModal'in olusturma ucu. useSites(projectId) deseniyle ayni:
// projectId hook'a baglanir, mutate yalnizca govdeyi alir. site_count (proje
// hero seridinde) proje detay sorgusundan geldigi icin hem SITES hem PROJECT
// sorgu anahtari gecersiz kilinir (liste + hero ayni anda tazelenmeli).
export function useCreateSite(projectId: string): UseMutationResult<SiteListItem, Error, SiteCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/projects/{project_id}/sites", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [PROJECT_QUERY_KEY, projectId] });
    },
  });
}
