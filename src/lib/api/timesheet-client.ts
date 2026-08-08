import { BackendError } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";

// F-PT T1 · Puantaj matrisinin Excel disa aktarimi.
// `audit-client.ts` / `boq-client.ts` kanonu BIREBIR izlenir — yeni desen
// icat EDILMEZ.

const DEFAULT_EXPORT_FILENAME = "puantaj.xlsx";

/** `siteId` UUID beklenir ama rota parametresi KULLANICI GIRDISIDIR. */
function timesheetExportPath(siteId: string, query: Record<string, string>): string {
  const qs = new URLSearchParams(query).toString();
  const path = `/api/backend/sites/${encodeURIComponent(siteId)}/timesheet/export.xlsx`;
  return qs ? `${path}?${qs}` : path;
}

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

export interface TimesheetExportQuery {
  year: number;
  month: number;
  /** YALNIZ gorunumu suzer — Excel de ekranda gorulenle ayni kapsami tasir. */
  sectionId?: string;
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da burada bilinçli
 * olarak ham `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre
 * JSON/metin olarak çözer ve ikili gövde (xlsx) için `Blob` vermez.
 *
 * BFF ikili/JSON kararını `Content-Type`tan verir ve `status >= 400` HER ZAMAN
 * JSON dalına gider — bu yüzden 403/404/422 gövdeleri burada `BackendError`
 * olarak okunabilir.
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
  const response = await globalThis.fetch(timesheetExportPath(siteId, search), {
    method: "GET",
    credentials: "same-origin",
  });
  if (!response.ok) throw await toBackendError(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = exportFilename(
      response.headers.get("content-disposition"),
      DEFAULT_EXPORT_FILENAME,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // `finally`: tarayici indirmeyi reddetse bile obje URL'i sizdirilmez.
    URL.revokeObjectURL(objectUrl);
  }
}
