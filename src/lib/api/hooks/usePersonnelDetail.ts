import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { PersonnelListItem } from "./usePersonnel";

// F-PT2 T1 · Personel Detay — `useSection.ts` deseniyle AYNI: bos id ile aga
// cikilmaz (detay ekrani henuz id cozmemisken hook kosulsuz cagrilir).
// `PersonnelResponse` yaniti `usePersonnel.ts`teki `PersonnelListItem`
// TAKMA ADIYLA AYNI govdedir (liste ve detay ayni semayi doner) — ikinci bir
// tip takma adi turetmek yerine mevcut tip yeniden kullanilir.
export type PersonnelDetailResponse = PersonnelListItem;

export const PERSONNEL_DETAIL_QUERY_KEY = "personnel-detail";

export function usePersonnelDetail(
  personnelId: string,
): UseQueryResult<PersonnelDetailResponse, Error> {
  return useQuery({
    enabled: personnelId.length > 0,
    queryKey: [PERSONNEL_DETAIL_QUERY_KEY, personnelId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/personnel/{personnel_id}", {
          params: { path: { personnel_id: personnelId } },
        }),
      ),
  });
}
