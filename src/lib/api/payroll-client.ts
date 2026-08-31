import { downloadExport } from "@/lib/api/download";

// F-BOR T2 · BY:55 "Excel" — `GET /payroll/periods/{id}/export` (XLSX ikili).
// EXPORT-XLSX T2 · BG:22 "Excel İndir" — `GET /payroll/periods/export.xlsx`.
// 🔴 İndirme gövdesi `@/lib/api/download` TEK kaynağındadır.

const DEFAULT_EXPORT_FILENAME = "bordro.xlsx";

/** `GET /payroll/periods/export.xlsx` — dönem-üstü liste çıktısı (BG:22). */
const PERIODS_EXPORT_PATH = "/api/backend/payroll/periods/export.xlsx";
const DEFAULT_PERIODS_EXPORT_FILENAME = "bordro-donemleri.xlsx";

/** `periodId` UUID beklenir ama URL parçası olduğu için yine de kaçırılır. */
function payrollExportPath(periodId: string): string {
  return `/api/backend/payroll/periods/${encodeURIComponent(periodId)}/export`;
}

/**
 * Dönem bordrosunu Excel olarak indirir.
 *
 * Uç şemada olsa da bilinçli olarak ham `fetch` kullanılır: `openapi-fetch`
 * yanıtı içerik tipine göre çözer ve ikili gövde (xlsx) için `Blob` vermez.
 * `status >= 400` BFF'te HER ZAMAN JSON dalıdır, bu yüzden Türkçe `detail`
 * gövdesi `BackendError` olarak okunabilir.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadPayrollExport(periodId: string): Promise<void> {
  await downloadExport(payrollExportPath(periodId), DEFAULT_EXPORT_FILENAME);
}

/**
 * EXPORT-XLSX · Bordro Geçmişi (BG:22) — `GET /payroll/periods/export.xlsx`.
 *
 * 🔴 SÜZGEÇ ALMAZ ve bu bir TERCİH DEĞİL ÖLÇÜMDÜR: liste ucu
 * (`GET /payroll/periods`) da `year` parametresi ALMAZ — ekranın yıl seçici
 * İSTEMCİDE süzer (`PayrollHistoryView` K6). Uydurma bir `year` parametresi
 * GÖNDERİLMEZ; sunucu onu tanımaz ve 422 verirdi. Bunun sonucu, Excel'in
 * ekranda görünen yıldan DAHA GENİŞ olmasıdır — ekran bunu düğmenin yanında
 * GÖRÜNÜR bir cümleyle söyler, sessizce geçmez.
 */
export async function downloadPayrollPeriodsExport(): Promise<void> {
  await downloadExport(PERIODS_EXPORT_PATH, DEFAULT_PERIODS_EXPORT_FILENAME);
}
