import { downloadExport, withQuery } from "@/lib/api/download";

// F-PT T1 · Puantaj matrisinin Excel disa aktarimi.
// 🔴 EXPORT-XLSX · indirme govdesi `@/lib/api/download` TEK kaynagindadir.

const DEFAULT_EXPORT_FILENAME = "puantaj.xlsx";

/** `siteId` UUID beklenir ama rota parametresi KULLANICI GIRDISIDIR. */
function timesheetExportPath(siteId: string, query: Record<string, string>): string {
  return withQuery(
    `/api/backend/sites/${encodeURIComponent(siteId)}/timesheet/export.xlsx`,
    query,
  );
}

export interface TimesheetExportQuery {
  year: number;
  month: number;
  /** YALNIZ gorunumu suzer — Excel de ekranda gorulenle ayni kapsami tasir. */
  sectionId?: string;
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da bilinçli olarak ham
 * `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre JSON/metin olarak
 * çözer ve ikili gövde (xlsx) için `Blob` vermez.
 *
 * BFF ikili/JSON kararını `Content-Type`tan verir ve `status >= 400` HER ZAMAN
 * JSON dalına gider — bu yüzden 403/404/422 gövdeleri `BackendError` olarak
 * okunabilir.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadTimesheetExport(
  siteId: string,
  query: TimesheetExportQuery,
): Promise<void> {
  const search: Record<string, string> = {
    year: String(query.year),
    month: String(query.month),
    ...(query.sectionId !== undefined ? { section_id: query.sectionId } : {}),
  };
  await downloadExport(timesheetExportPath(siteId, search), DEFAULT_EXPORT_FILENAME);
}
