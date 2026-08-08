import { backendErrorMessage } from "@/lib/api/error-message";
import { BackendError } from "@/lib/api/unwrap";

/**
 * Puantaj yazma/indirme hatalarının Türkçe metinleri.
 *
 * Mesaj deseni repodaki TEK KAYNAKTAN gelir (`lib/api/error-message.ts`):
 * backend `detail`i varsa O basılır — kişi-gün çakışmasında hangi personelin
 * hangi güne çakıştığı yanıtın içindedir ve UYDURULMADAN kullanıcıya geçer.
 * `detail` okunamazsa aşağıdaki düşüş metinleri devreye girer.
 */

/** 409 — personel aynı gün BAŞKA bir şantiyede kayıtlı (backend kuralı). */
const CONFLICT_FALLBACK =
  "Bir personel aynı güne başka bir şantiyede kayıtlı — kişi aynı gün iki şantiyede puantajlanamaz.";

const SAVE_FALLBACK = "Puantaj kaydedilemedi.";
const EXPORT_FALLBACK = "Excel dosyası indirilemedi.";

export function timesheetSaveErrorMessage(error: unknown): string {
  if (error instanceof BackendError && error.status === 409) {
    return `Kişi-gün çakışması: ${backendErrorMessage(error, CONFLICT_FALLBACK)}`;
  }
  return backendErrorMessage(error, SAVE_FALLBACK);
}

export function timesheetExportErrorMessage(error: unknown): string {
  return backendErrorMessage(error, EXPORT_FALLBACK);
}
