import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { PERSONNEL_QUERY_KEY, type PersonnelListItem } from "./usePersonnel";

export type PersonnelCreateRequest = components["schemas"]["PersonnelCreate"];

/**
 * Personel olusturma (`POST /personnel`) — `useCreateEmployer` deseniyle AYNI:
 * govde aynen backend'e gecirilir, hata YUTULMAZ (`BackendError` cagirana
 * ulasir; form Turkce `detail` mesajini gosterir).
 *
 * `source` ZORUNLUDUR (`company | subcontractor | general`); `subcontractor`
 * kaynagi icin `subcontractor_id` beklenir — dogrulama backend'dedir, hook
 * govdeyi sessizce duzeltmez.
 */
export function useCreatePersonnel(): UseMutationResult<
  PersonnelListItem,
  Error,
  PersonnelCreateRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => unwrap(await backendClient.POST("/personnel", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PERSONNEL_QUERY_KEY] }),
  });
}
