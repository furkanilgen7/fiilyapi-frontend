import { BackendError } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";

// Ekran 13 · Is Kalemleri (BOQ) Excel disa aktarimi (spec §8.2).
// `audit-client.ts`'teki `downloadAuditExport` kanonu birebir izlenir.

const DEFAULT_EXPORT_FILENAME = "is-kalemleri.xlsx";

// `siteId` UUID beklenir ama rota parametresi KULLANICI GIRDISIDIR — sablona
// girmeden once kacisi yapilir.
function boqExportPath(siteId: string): string {
  return `/api/backend/sites/${encodeURIComponent(siteId)}/boq/export`;
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
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadBoqExport(siteId: string): Promise<void> {
  const response = await globalThis.fetch(boqExportPath(siteId), {
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
