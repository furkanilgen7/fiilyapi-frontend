import { backendErrorMessage } from "@/lib/api/error-message";
import { BackendError } from "@/lib/api/unwrap";

import { parseLockedDays, toDayLocks, type TimesheetDayLock } from "./timesheet-lock";

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
/** 409 — kilitli güne değişiklik (rapor onayı, §3.14 P5). */
const LOCK_FALLBACK = "Kilitli güne yapılan değişiklik kaydedilemedi.";
const EXPORT_FALLBACK = "Excel dosyası indirilemedi.";

/**
 * Kilit 409'unun gövdesi (§3.14 P5 + EV-BORC-4) — openapi'de YOK, elle
 * yazıldı. Yalnız belgeleme içindir: gövde DIŞ VERİDİR ve alan alan
 * doğrulanır (`timesheetLockConflictLocks`).
 */
export interface TimesheetLockConflictBody {
  detail: string;
  locked_days: string[];
  day_locks?: { day: string; report_date: string }[];
}

/**
 * PLN-F2.4 · KİLİT 409'u → gün başına kilit; kilit 409'u değilse `null`.
 *
 * Aynı durum kodunu kişi-gün çakışması da kullanır; AYIRAN, gövdenin geçerli
 * bir `locked_days` dizisi taşımasıdır (KATI: dizi değilse, boşsa ya da tek
 * öğesi ISO gün değilse kilit SAYILMAZ). Rapor tarihleri `day_locks`tan
 * `toDayLocks` ile okunur; bozuk `day_locks` öğesi atılır.
 */
export function timesheetLockConflictLocks(error: unknown): TimesheetDayLock[] | null {
  if (!(error instanceof BackendError) || error.status !== 409) return null;
  if (!error.body || typeof error.body !== "object") return null;
  const body = error.body as Partial<Record<keyof TimesheetLockConflictBody, unknown>>;
  if (parseLockedDays(body.locked_days) === null) return null;
  return toDayLocks(body);
}

export function timesheetSaveErrorMessage(error: unknown): string {
  // Kilit 409'u "Kişi-gün çakışması" DEĞİLDİR — ön ek basılmaz.
  if (timesheetLockConflictLocks(error) !== null) {
    return backendErrorMessage(error, LOCK_FALLBACK);
  }
  if (error instanceof BackendError && error.status === 409) {
    return `Kişi-gün çakışması: ${backendErrorMessage(error, CONFLICT_FALLBACK)}`;
  }
  return backendErrorMessage(error, SAVE_FALLBACK);
}

export function timesheetExportErrorMessage(error: unknown): string {
  return backendErrorMessage(error, EXPORT_FALLBACK);
}
