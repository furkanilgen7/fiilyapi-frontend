import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";

/**
 * Hücre KODLARININ tek kaynağı (PUAN-SAAT).
 *
 * 🔴 KOD ARTIK ÇALIŞILAN GÜNÜ ANLATMAZ. Puantaj gün kodundan adam-SAATE geçti
 * (mockup `Ekran 5 - Puantaj.dc.html`, `5f3a944`): çalışılan gün `hours`
 * kolonudur, kod yalnız "o gün çalışılmadı ama SEBEBİ var" hâlini taşır.
 * `worked` ve `overtime` enum üyeleri KALKTI — fazla mesai SAKLANMAZ,
 * backend'in haftalık türevidir.
 *
 * Mockup'ta `İzin` ve `Görev` ROZETTİR (E5 260/281). `holiday` (Tatil) yeni
 * mockup'ta çizilmemiştir ama enum üyesi KORUNDU (canlıda o kodu taşıyan satır
 * olabilir); rozeti veride varsa BASILIR — kayıt gizlenmez.
 */
export interface TimesheetCodeMeta {
  code: TimesheetCode;
  /** Hücre rozetinin metni (E5 260 "İzin" · E5 281 "Görev"). */
  letter: string;
  /** Legend / popover etiketi. */
  label: string;
  /** CSS sınıf eki — `.ts-tag--leave` gibi. */
  modifier: string;
}

export const TIMESHEET_CODES: readonly TimesheetCodeMeta[] = [
  // E5 260 · legend E5 206
  { code: "leave", letter: "İzin", label: "İzin", modifier: "leave" },
  // E5 281 · legend E5 207
  { code: "temporary_duty", letter: "Görev", label: "Geçici görev", modifier: "temporary-duty" },
  // Yeni mockup'ta ÇİZİLMEDİ; enum üyesi korundu, veride varsa basılır.
  { code: "holiday", letter: "Tatil", label: "Tatil", modifier: "holiday" },
];

/** Puantaj ekranının mockup varyantı: E5 (genel) / ŞP (şantiye sekmesi). */
export type TimesheetVariant = "general" | "site";

const BY_CODE = new Map<TimesheetCode, TimesheetCodeMeta>(
  TIMESHEET_CODES.map((meta) => [meta.code, meta]),
);

export function timesheetCodeMeta(code: TimesheetCode): TimesheetCodeMeta | undefined {
  return BY_CODE.get(code);
}

/**
 * SAAT hücresinin renk sınıfı eki (E5 legend 203-208, `.hin` aileleri).
 *
 * 🔴 Renk bir İPUCUDUR, HESAP DEĞİL: "fazla mesai" tonu o günün saati normal
 * gün saatini aşıyor demektir — haftalık FM türevini ANLATMAZ (FM haftalık 45
 * saat tavanıyla birlikte hesaplanır ve tek kaynağı backend'dir). Renkten
 * bordro çıkarılamaz.
 */
export function dayHoursModifier(hours: string | null, normalDayHours: string): string {
  if (hours === null || hours.trim().length === 0) return "off";
  const value = Number(hours);
  const normal = Number(normalDayHours);
  if (!Number.isFinite(value) || !Number.isFinite(normal) || normal <= 0) return "full";
  if (value > normal) return "overtime";
  if (value < normal) return "short";
  return "full";
}

/**
 * "Şirket" / "Taşeron" Tür rozeti (ŞP 150, 170).
 *
 * Etiketler UYDURULMAZ, repodaki TEK KAYNAKTAN gelir:
 * `src/components/site-diary/diary-labels.ts` (`WORKER_SOURCE_LABELS`).
 * Rozet RENGİ de tek kaynaktan: `resolveSourceBadgeVariant`
 * (`src/components/personnel/personnel-list-labels.ts`) — `/personel`
 * listesiyle AYNI eşleme.
 */
export {
  WORKER_SOURCE_LABELS,
  resolveWorkerSourceLabel,
  WORKER_SOURCE_VALUES,
} from "@/components/site-diary/diary-labels";
export { resolveSourceBadgeVariant } from "@/components/personnel/personnel-list-labels";
