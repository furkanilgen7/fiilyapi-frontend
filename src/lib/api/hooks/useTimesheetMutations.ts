import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { TIMESHEET_QUERY_KEY, type TimesheetMatrix, type TimesheetPeriod } from "./useTimesheet";

// F-PT T1 · Puantaj kaydetme ucu.
// ⚠️ Sema adlari `TimesheetSave` / `TimesheetCellInput` diye ayrisir; takma
// adlar `pnpm gen:api` ciktisindan BIREBIR alinir.
export type TimesheetSave = components["schemas"]["TimesheetSave"];
export type TimesheetCellInput = components["schemas"]["TimesheetCellInput"];

/* ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️  KAPSAM KURALI — BU DILIMIN EN KRITIK TUZAGI  ⚠️⚠️
 *
 * `PUT /sites/{site_id}/timesheet` DEGISTIRMEDIR (replace), ekleme DEGIL:
 * govde DONEM (`year`+`month`) + SANTIYE kapsaminin TAM hucre kumesidir ve
 * GOVDEDE GECMEYEN HER HUCRE SILINIR. Baska ayin ya da baska santiyenin
 * hucrelerine DOKUNULMAZ.
 *
 * Bunun pratik sonucu: ekranda BOLUM FILTRESI AKTIFKEN BILE govde HER ZAMAN
 * santiyenin TAM hucre kumesidir. Filtre yalnizca GORUNUMU suzer. Filtreli
 * (yalnizca gorunen bolumun) kumesi gonderilirse DIGER BOLUMLERIN o aya ait
 * TUM kayitlari sessizce SILINIR.
 *
 * Bu yuzden hook'un imzasi bilinclidir:
 *   • `sectionId` ALMAZ — filtreli kumeyi kazara gondermeyi kolaylastirmasin.
 *   • Yanit GUNCEL TAM matristir (bolum suzgeci UYGULANMAZ) — ekran
 *     kaydettiginin tamamini geri gorur.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ay + santiye kapsaminin TUM hucrelerini kaydeder.
 *
 * 409 (kisi ayni gun baska santiyede kayitli) burada YUTULMAZ — `BackendError`
 * olarak cagirana ulasir, ekran Turkce `detail` mesajini gosterir.
 */
export function useSaveTimesheet(
  siteId: string,
  period: TimesheetPeriod,
): UseMutationResult<TimesheetMatrix, Error, TimesheetSave> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.PUT("/sites/{site_id}/timesheet", {
          params: {
            path: { site_id: siteId },
            query: { year: period.year, month: period.month },
          },
          body,
        }),
      ),
    // Prefix eslesme: santiyenin TUM donem/bolum varyantlari tazelenir —
    // yalniz aktif bolum gorunumunu tazelemek diger bolumleri bayat birakirdi.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [TIMESHEET_QUERY_KEY, siteId] }),
  });
}
