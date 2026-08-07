import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-PT T1 · Puantaj matrisinin OKUMA sorgusu (E5 + ŞP ortak cekirdegi).
// `useSitePlan.ts` deseniyle AYNI: tipler `pnpm gen:api` ciktisindan takma ad
// olarak alinir, elle arayuz yazmak yasak.
export type TimesheetMatrix = components["schemas"]["TimesheetMatrix"];
export type TimesheetMatrixRow = components["schemas"]["TimesheetMatrixRow"];
export type TimesheetCell = components["schemas"]["TimesheetCell"];
export type TimesheetDayTotal = components["schemas"]["TimesheetDayTotal"];
export type TimesheetCode = components["schemas"]["TimesheetCode"];

export const TIMESHEET_QUERY_KEY = "timesheet";

/** `GET /sites/{site_id}/timesheet` — `year`/`month` ZORUNLU, bolum opsiyonel. */
export interface TimesheetPeriod {
  year: number;
  month: number;
}

/**
 * Puantaj matrisi (`GET /sites/{site_id}/timesheet`).
 *
 * `year`/`month` ZORUNLUDUR — eksik gonderilirse gercek backend 422 doner, bu
 * yuzden bos `siteId` ile aga CIKILMAZ (`useSitePlan` deseni).
 *
 * `sectionId` YALNIZ GORUNUMU suzer (ŞP 99 "Tüm Bölümler / Kat 6–10"): baska
 * santiyenin bolumu bos matris DEGIL 404 alir. Kaydetme kapsamiyla
 * KARISTIRILMAMALIDIR — bkz. `useSaveTimesheet`in kapsam uyarisi.
 *
 * Hucreler SEYREKTIR: girilmemis gun hucre URETMEZ, gun iskeleti
 * `day_totals`ten okunur.
 */
export function useTimesheet(
  siteId: string,
  period: TimesheetPeriod,
  sectionId?: string,
): UseQueryResult<TimesheetMatrix, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [TIMESHEET_QUERY_KEY, siteId, period.year, period.month, sectionId ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/timesheet", {
          params: {
            path: { site_id: siteId },
            query: {
              year: period.year,
              month: period.month,
              ...(sectionId !== undefined ? { section_id: sectionId } : {}),
            },
          },
        }),
      ),
  });
}
