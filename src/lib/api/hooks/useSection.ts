import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// P6 · Bölüm Detay ekranı tekil kaynağı (spec §5). `SectionResponse`ten
// TÜREYEN dar govdeden farkli olarak TUM P6 kolonlarini + 4 yer tutucuyu
// (progress_pct/boq_item_count/budget/worker_count) tasir.
export type SectionDetailResponse = components["schemas"]["SectionDetailResponse"];

export const SECTION_QUERY_KEY = "section";

// `useSite`/`useBoq` deseniyle ayni: sectionId bos oldugunda aga cikilmaz —
// drill kabugu henuz bir bolum secmediginde hook bos id ile cagrilabilir
// (hook'lar kosullu cagrilamaz).
export function useSection(sectionId: string): UseQueryResult<SectionDetailResponse, Error> {
  return useQuery({
    enabled: sectionId.length > 0,
    queryKey: [SECTION_QUERY_KEY, sectionId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sections/{section_id}", {
          params: { path: { section_id: sectionId } },
        }),
      ),
  });
}
