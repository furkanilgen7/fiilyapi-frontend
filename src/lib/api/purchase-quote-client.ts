import { downloadExport } from "@/lib/api/download";

// F-SA T4 · TEK 38 "Excel" — teklif karşılaştırmasının Excel dışa aktarımı.
// 🔴 EXPORT-XLSX · indirme gövdesi `@/lib/api/download` TEK kaynağındadır
// (WORKFLOW §4: ikili indirme `Content-Type` tabanlı, `status >= 400` HER
// ZAMAN JSON dalı).

const DEFAULT_EXPORT_FILENAME = "teklif-karsilastirma.xlsx";

/** `requestId` UUID beklenir ama rota parametresi KULLANICI GİRDİSİDİR. */
function quoteExportPath(requestId: string): string {
  return `/api/backend/purchase-requests/${encodeURIComponent(requestId)}/quotes/export.xlsx`;
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
export async function downloadQuoteComparisonExport(requestId: string): Promise<void> {
  await downloadExport(quoteExportPath(requestId), DEFAULT_EXPORT_FILENAME);
}
