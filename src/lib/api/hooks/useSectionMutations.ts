import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { SITE_QUERY_KEY } from "./useSites";

export type SectionCreateRequest = components["schemas"]["SectionCreate"];
export type SectionResponse = components["schemas"]["SectionResponse"];

// Task 10 — SectionFormModal'in olusturma ucu. useCreateSite (Task 7) deseniyle
// ayni: siteId hook'a baglanir, mutate yalnizca govdeyi alir. Bolum listesi VE
// hero'daki section_count/section_status_counts tek bir sorgudan (useSite)
// geldigi icin SITE_QUERY_KEY'i gecersiz kilmak ikisini de tazeler.
export function useCreateSection(siteId: string): UseMutationResult<SectionResponse, Error, SectionCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/sections", {
          params: { path: { site_id: siteId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE_QUERY_KEY, siteId] });
    },
  });
}
