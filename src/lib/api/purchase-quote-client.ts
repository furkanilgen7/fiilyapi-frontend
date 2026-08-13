import { BackendError } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";

// F-SA T4 · TEK 38 "Excel" — teklif karşılaştırmasının Excel dışa aktarımı.
// `timesheet-client.ts` / `boq-client.ts` / `audit-client.ts` kanonu BİREBİR
// izlenir — yeni indirme deseni İCAT EDİLMEZ (WORKFLOW §4: ikili indirme
// `Content-Type` tabanlı, `status >= 400` HER ZAMAN JSON dalı).

const DEFAULT_EXPORT_FILENAME = "teklif-karsilastirma.xlsx";

/** `requestId` UUID beklenir ama rota parametresi KULLANICI GİRDİSİDİR. */
function quoteExportPath(requestId: string): string {
  return `/api/backend/purchase-requests/${encodeURIComponent(requestId)}/quotes/export.xlsx`;
}

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
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
export async function downloadQuoteComparisonExport(requestId: string): Promise<void> {
  const response = await globalThis.fetch(quoteExportPath(requestId), {
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
