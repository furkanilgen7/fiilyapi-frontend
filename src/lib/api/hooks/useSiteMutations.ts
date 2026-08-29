import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { SITES_QUERY_KEY } from "./useSites";
import { PROJECT_QUERY_KEY } from "./useProjects";

export type SiteCreateRequest = components["schemas"]["SiteCreate"];

/**
 * 201 yaniti `SiteDetailResponse`'tur (openapi.json). Yeni santiyenin detay
 * sayfasina yonlendirme bu tipin `id` alanina dayanir (spec §12).
 */
export type SiteCreateResponse = components["schemas"]["SiteDetailResponse"];

// Santiye olusturma ucu (T10'dan beri tam sayfa form kullanir). useSites(projectId) deseniyle ayni:
// projectId hook'a baglanir, mutate yalnizca govdeyi alir. site_count (proje
// hero seridinde) proje detay sorgusundan geldigi icin hem SITES hem PROJECT
// sorgu anahtari gecersiz kilinir (liste + hero ayni anda tazelenmeli).
export function useCreateSite(projectId: string): UseMutationResult<SiteCreateResponse, Error, SiteCreateRequest> {
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
      // Liste anahtari KANONIK UUID tasir (uc UUID bekler) — o eslesme dogru.
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, projectId] });
      // 🔴 URL-3 — proje DETAY sorgusu ADRESTEKI anahtarla onbelleklenir
      // (slug olabilir); kanonik UUID'yi adlayan on ek onu ESLESTIREMEZ.
      // Tip on eki kullanilir (bkz. `useSectionMutations` notu).
      queryClient.invalidateQueries({ queryKey: [PROJECT_QUERY_KEY] });
    },
  });
}
