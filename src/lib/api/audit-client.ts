import { backendClient } from "@/lib/api/client";
import { BackendError, unwrap } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";
import { toSearchParams } from "@/lib/settings/audit-query";
import type { AuditExportQuery, AuditListResponse, AuditLogQuery } from "@/lib/api/models";

const AUDIT_EXPORT_PATH = "/api/backend/audit-log/export.xlsx";
const DEFAULT_EXPORT_FILENAME = "denetim-gunlugu.xlsx";

/** Liste ucu şemada olduğu için tip-güvenli `backendClient` + `unwrap` kullanır. */
export async function fetchAuditLog(query: AuditLogQuery): Promise<AuditListResponse> {
  return unwrap(await backendClient.GET("/audit-log", { params: { query } }));
}

function withQuery(path: string, query: Record<string, string>): string {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
}

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da burada bilinçli olarak ham
 * `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre JSON/metin olarak çözer ve
 * ikili gövde (xlsx) için `Blob` vermez. Hata sözleşmesi aynı — 2xx dışı → BackendError.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre KOYULMAZ,
 * istek `credentials: "same-origin"` ile gider.
 */
export async function downloadAuditExport(query: AuditExportQuery): Promise<void> {
  const response = await globalThis.fetch(withQuery(AUDIT_EXPORT_PATH, toSearchParams(query)), {
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
    URL.revokeObjectURL(objectUrl);
  }
}
