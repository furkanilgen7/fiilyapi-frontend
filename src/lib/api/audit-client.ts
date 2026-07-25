import { BackendError } from "@/lib/api/unwrap";
import type { AuditListResponse } from "@/lib/api/audit-types";

/**
 * GEÇİCİ: `/audit-log` uçları OpenAPI şemasında olmadığı için `backendClient`
 * (openapi-fetch) üzerinden çağrılamıyor. Şema Task 6'da güncellenince bu dosya
 * `backendClient.GET("/audit-log", …)` + `unwrap` ile değiştirilecek.
 *
 * Hata sözleşmesi aynı: 2xx dışı → BackendError (403 → `isForbidden`).
 */

const AUDIT_LOG_PATH = "/api/backend/audit-log";
const AUDIT_EXPORT_PATH = "/api/backend/audit-log/export.xlsx";
const DEFAULT_EXPORT_FILENAME = "denetim-gunlugu.xlsx";

function withQuery(path: string, query: Record<string, string>): string {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
}

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

export async function fetchAuditLog(query: Record<string, string>): Promise<AuditListResponse> {
  const response = await globalThis.fetch(withQuery(AUDIT_LOG_PATH, query), {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw await toBackendError(response);
  return (await response.json()) as AuditListResponse;
}

// Content-Disposition'dan yalnızca güvenli bir dosya adı çıkarır (yol ayracı/kontrol
// karakteri kabul edilmez); aksi halde sabit varsayılan kullanılır.
export function exportFilename(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  const candidate = match?.[1]?.trim();
  if (!candidate) return DEFAULT_EXPORT_FILENAME;
  if (!/^[\w.\- ]+\.xlsx$/i.test(candidate)) return DEFAULT_EXPORT_FILENAME;
  return candidate;
}

/**
 * Excel dosyasını BFF üzerinden indirir. Token yalnızca httpOnly cookie'de kalır —
 * URL'e imzalı token/parametre KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadAuditExport(query: Record<string, string>): Promise<void> {
  const response = await globalThis.fetch(withQuery(AUDIT_EXPORT_PATH, query), {
    method: "GET",
    credentials: "same-origin",
  });
  if (!response.ok) throw await toBackendError(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = exportFilename(response.headers.get("content-disposition"));
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
