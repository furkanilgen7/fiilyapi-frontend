import { BackendError } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";

// F-BOR T2 · BY:55 "Excel" — `GET /payroll/periods/{id}/export` (XLSX ikili).
// `boq-client.ts` / `audit-client.ts` kanonu BİREBİR izlenir; yeni desen icat
// EDİLMEZ.

const DEFAULT_EXPORT_FILENAME = "bordro.xlsx";

/** `periodId` UUID beklenir ama URL parçası olduğu için yine de kaçırılır. */
function payrollExportPath(periodId: string): string {
  return `/api/backend/payroll/periods/${encodeURIComponent(periodId)}/export`;
}

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

/**
 * Dönem bordrosunu Excel olarak indirir.
 *
 * Uç şemada olsa da burada bilinçli olarak ham `fetch` kullanılır:
 * `openapi-fetch` yanıtı içerik tipine göre çözer ve ikili gövde (xlsx) için
 * `Blob` vermez. `status >= 400` BFF'te HER ZAMAN JSON dalıdır, bu yüzden
 * Türkçe `detail` gövdesi `BackendError` olarak okunabilir.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadPayrollExport(periodId: string): Promise<void> {
  const response = await globalThis.fetch(payrollExportPath(periodId), {
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
    // `finally`: tarayıcı indirmeyi reddetse bile obje URL'i sızdırılmaz.
    URL.revokeObjectURL(objectUrl);
  }
}
