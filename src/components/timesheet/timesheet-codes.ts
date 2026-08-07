import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";

/**
 * Hücre kodlarının TEK kaynağı (F-PT T2).
 *
 * ŞP legend'i BEŞLİDİR (ŞP 107-111: Ç · İ · T · FM · G); E5'in dörtlüsü
 * (E5 80-83) bunun ALT KÜMESİDİR — iki ekran aynı seti kullanır, ikinci bir
 * kod tablosu yazılmaz. Harfler ve renkler mockup'tan; "yarım gün"/"rapor"
 * gibi mockup'ta olmayan kod UYDURULMAZ (backend enum'u da beşlidir).
 */
export interface TimesheetCodeMeta {
  code: TimesheetCode;
  /** Hücre rozetinin harfi (E5 117-128 · ŞP 151-164). */
  letter: string;
  /** Legend'in kısa etiketi (ŞP 107-111). */
  label: string;
  /** Legend'in harfli etiketi (E5 80-83: "Çalıştı (Ç)"). */
  labelWithLetter: string;
  /** CSS sınıf eki — `.ts-cell--worked` gibi. */
  modifier: string;
}

export const TIMESHEET_CODES: readonly TimesheetCodeMeta[] = [
  // ŞP 107 · E5 80
  { code: "worked", letter: "Ç", label: "Çalıştı", labelWithLetter: "Çalıştı (Ç)", modifier: "worked" },
  // ŞP 108 · E5 81
  { code: "leave", letter: "İ", label: "İzin", labelWithLetter: "İzin (İ)", modifier: "leave" },
  // ŞP 109 · E5 82
  { code: "holiday", letter: "T", label: "Tatil", labelWithLetter: "Tatil (T)", modifier: "holiday" },
  // ŞP 110 · E5 83
  {
    code: "overtime",
    letter: "FM",
    label: "Fazla Mesai",
    labelWithLetter: "Fazla Mesai (FM)",
    modifier: "overtime",
  },
  // ŞP 111 — E5 legend'inde YOK (dörtlü alt küme), hücre seti ortaktır.
  {
    code: "temporary_duty",
    letter: "G",
    label: "Geçici Görev",
    labelWithLetter: "Geçici Görev (G)",
    modifier: "temporary-duty",
  },
];

const BY_CODE = new Map<TimesheetCode, TimesheetCodeMeta>(
  TIMESHEET_CODES.map((meta) => [meta.code, meta]),
);

export function timesheetCodeMeta(code: TimesheetCode): TimesheetCodeMeta | undefined {
  return BY_CODE.get(code);
}

/** "Şirket" / "Taşeron" Tür rozeti (ŞP 150, 170, 190, 210). */
export const WORKER_SOURCE_LABELS: Record<string, string> = {
  company: "Şirket",
  subcontractor: "Taşeron",
  // `general` (düz/yevmiyeli işçi) mockup'ta YOK; rozet uydurulmaz, kaynak
  // adı Türkçeleştirilip aynı nötr biçimde basılır.
  general: "Yevmiyeli",
};
