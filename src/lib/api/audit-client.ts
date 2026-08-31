import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import { downloadExport, withQuery } from "@/lib/api/download";
import { toSearchParams } from "@/lib/settings/audit-query";
import type { AuditExportQuery, AuditListResponse, AuditLogQuery } from "@/lib/api/models";

const AUDIT_EXPORT_PATH = "/api/backend/audit-log/export.xlsx";
const DEFAULT_EXPORT_FILENAME = "denetim-gunlugu.xlsx";

/** Liste ucu şemada olduğu için tip-güvenli `backendClient` + `unwrap` kullanır. */
export async function fetchAuditLog(query: AuditLogQuery): Promise<AuditListResponse> {
  return unwrap(await backendClient.GET("/audit-log", { params: { query } }));
}

/**
 * Excel dosyasını BFF üzerinden indirir.
 *
 * 🔴 EXPORT-XLSX · gövde artık `@/lib/api/download`taki TEK kaynaktan gelir.
 * Aynı blok DOKUZ istemcide birebir kopyalanmıştı; `revokeObjectURL`u bir
 * kopyada `finally` dışına almak SESSİZ bir bellek sızıntısıdır ve hiçbir
 * ekran testi görmez. Sözleşme DEĞİŞMEDİ: ham `fetch` (openapi-fetch ikili
 * gövde için `Blob` vermez), `status >= 400` → `BackendError`, token yalnız
 * httpOnly çerezde (URL'e imzalı parametre KOYULMAZ).
 */
export async function downloadAuditExport(query: AuditExportQuery): Promise<void> {
  await downloadExport(
    withQuery(AUDIT_EXPORT_PATH, toSearchParams(query)),
    DEFAULT_EXPORT_FILENAME,
  );
}
