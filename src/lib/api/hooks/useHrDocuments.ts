import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

/**
 * F-İK T2 · `GET /hr/documents/summary` — İK belge takibinin TEK özet ucu
 * (`useStockSummary.ts`/`usePersonnel.ts` deseni: tipler `pnpm gen:api`
 * çıktısından takma ad olarak alınır, elle arayüz yazmak yasak).
 *
 * ⚠️ BFF: bu ucun ilk path segmenti "personnel" DEĞİL "hr"dir; izin listesinde
 * ayrı bir kök olarak durur (`src/app/api/backend/[...path]/route.ts`).
 *
 * ⚠️ Sayılar BELGE sayısıdır (`missing` hariç — o personel sayısıdır). Personel
 * ekranı bu sayılardan "N personel" cümlesi TÜRETMEZ (şef kararı).
 */
export type HrDocumentsSummaryResponse = components["schemas"]["HrDocumentsSummaryResponse"];
export type HrDocumentTypeBreakdown = components["schemas"]["HrDocumentTypeBreakdown"];

export const HR_DOCUMENTS_SUMMARY_QUERY_KEY = "hr-documents-summary";

export function useHrDocumentsSummary(): UseQueryResult<HrDocumentsSummaryResponse, Error> {
  return useQuery({
    queryKey: [HR_DOCUMENTS_SUMMARY_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/hr/documents/summary", {})),
  });
}
