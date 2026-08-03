import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-SD T1 · Şantiye Günlüğü — okuma sorgulari. `useProgressPayments.ts` /
// `useSubcontractorProgressPayments.ts` deseniyle AYNI: tipler `pnpm gen:api`
// ciktisindan takma ad olarak alinir, elle arayuz yazmak yasak.
export type SiteDiaryEntryDetail = components["schemas"]["SiteDiaryEntryDetail"];
export type SiteDiaryEntryListItem = components["schemas"]["SiteDiaryEntryListItem"];
export type SiteDiaryEntryListResponse = components["schemas"]["SiteDiaryEntryListResponse"];
export type SiteDiaryLineRead = components["schemas"]["SiteDiaryLineRead"];
export type SiteDiaryWorkerCountRead = components["schemas"]["SiteDiaryWorkerCountRead"];
export type SiteDiarySummary = components["schemas"]["SiteDiarySummary"];
export type SiteDiarySummaryItem = components["schemas"]["SiteDiarySummaryItem"];
export type DiaryStatus = components["schemas"]["DiaryStatus"];
export type Weather = components["schemas"]["Weather"];
export type WorkerSource = components["schemas"]["WorkerSource"];

export const SITE_DIARY_ENTRIES_QUERY_KEY = "site-diary-entries";
export const SITE_DIARY_ENTRY_QUERY_KEY = "site-diary-entry";
export const SITE_DIARY_SUMMARY_QUERY_KEY = "site-diary-summary";

/**
 * `GET /sites/{site_id}/diary` filtreleri (openapi.json query parametreleri).
 * `limit` tavani 200, `offset` sayfalama icindir — liste yaniti `total`
 * tasir, sayfalama ekranda ondan turetilir.
 */
export interface SiteDiaryListFilter {
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}

/** `GET /sites/{site_id}/diary/summary` — YALNIZ ay/yil suzmesi alir. */
export interface SiteDiaryPeriodFilter {
  year?: number;
  month?: number;
}

function periodQuery(filter: SiteDiaryPeriodFilter): Record<string, number> {
  return {
    ...(filter.year !== undefined ? { year: filter.year } : {}),
    ...(filter.month !== undefined ? { month: filter.month } : {}),
  };
}

/**
 * Günlük kayit listesi (GK sag panel "Son Kayitlar" + Hakediş Özeti ay
 * gezinmesi). Bos `siteId` ile aga cikilmaz (`useBoq` deseni).
 */
export function useSiteDiaryEntries(
  siteId: string,
  filter: SiteDiaryListFilter = {},
): UseQueryResult<SiteDiaryEntryListResponse, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [
      SITE_DIARY_ENTRIES_QUERY_KEY,
      siteId,
      filter.year ?? null,
      filter.month ?? null,
      filter.limit ?? null,
      filter.offset ?? null,
    ],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/diary", {
          params: {
            path: { site_id: siteId },
            query: {
              ...periodQuery(filter),
              ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
              ...(filter.offset !== undefined ? { offset: filter.offset } : {}),
            },
          },
        }),
      ),
  });
}

/**
 * Tek günlük kaydin detayi — satirlar (`lines`), isci kirilimi
 * (`worker_counts`) ve turevler (`lines_total`/`worker_total`) bu yanittan
 * gelir; ekran ikinci istek atmaz.
 */
export function useSiteDiaryEntry(entryId: string): UseQueryResult<SiteDiaryEntryDetail, Error> {
  return useQuery({
    enabled: entryId.length > 0,
    queryKey: [SITE_DIARY_ENTRY_QUERY_KEY, entryId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/diary/{entry_id}", {
          params: { path: { entry_id: entryId } },
        }),
      ),
  });
}

/**
 * Poz bazli aylik birikim (Hakediş Özeti tablosu). Backend YALNIZ
 * `submitted` günleri toplar — taslak günler bu ucta GORUNMEZ.
 */
export function useSiteDiarySummary(
  siteId: string,
  filter: SiteDiaryPeriodFilter = {},
): UseQueryResult<SiteDiarySummary, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [SITE_DIARY_SUMMARY_QUERY_KEY, siteId, filter.year ?? null, filter.month ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/diary/summary", {
          params: { path: { site_id: siteId }, query: periodQuery(filter) },
        }),
      ),
  });
}
