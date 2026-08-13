import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";

/**
 * Hücre kodlarının TEK kaynağı (F-PT T2).
 *
 * HÜCRE seti beşlidir ve İKİ EKRANDA DA aynıdır — backend enum'u beşlidir,
 * "yarım gün"/"rapor" gibi mockup'ta olmayan kod UYDURULMAZ.
 *
 * LEGEND ise ekran başına AYRIDIR (kullanıcı kararı, 2026-08-07):
 *   • E5 79-84 → DÖRT öğe (Ç · İ · T · FM); `G` YOK.
 *   • ŞP 106-111 → BEŞ öğe (+ G).
 * E5 mockup'ı (79-84) 4'lü legend gösterir; `G` kodlu hücre veride varsa
 * rozeti YİNE BASILIR ama E5 legend'inde yer almaz — mockup kararı, sessiz
 * atlama değil (kayıt gizlenmez, veri kaybı olmaz).
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
  // ŞP 111 — E5 legend'inde YOK; hücre rozeti iki ekranda da basılır.
  {
    code: "temporary_duty",
    letter: "G",
    label: "Geçici Görev",
    labelWithLetter: "Geçici Görev (G)",
    modifier: "temporary-duty",
  },
];

/** Puantaj ekranının mockup varyantı: E5 (genel) / ŞP (şantiye sekmesi). */
export type TimesheetVariant = "general" | "site";

/**
 * Legend'de AÇIKLANAN kodlar — varyanta göre AYRI (D1 kararı):
 * E5 79-84 dört öğe · ŞP 106-111 beş öğe. Bu, `TIMESHEET_CODES`ten (hücre
 * seti) BİLEREK ayrıdır: E5'te `G` kodlu hücre basılır, legend'de anlatılmaz.
 */
export function legendCodesFor(variant: TimesheetVariant): readonly TimesheetCodeMeta[] {
  if (variant === "site") return TIMESHEET_CODES;
  return TIMESHEET_CODES.filter((meta) => meta.code !== "temporary_duty");
}

const BY_CODE = new Map<TimesheetCode, TimesheetCodeMeta>(
  TIMESHEET_CODES.map((meta) => [meta.code, meta]),
);

export function timesheetCodeMeta(code: TimesheetCode): TimesheetCodeMeta | undefined {
  return BY_CODE.get(code);
}

/**
 * "Şirket" / "Taşeron" Tür rozeti (ŞP 150, 170, 190, 210).
 *
 * Etiketler UYDURULMAZ, repodaki TEK KAYNAKTAN gelir:
 * `src/components/site-diary/diary-labels.ts:33-37` (`WORKER_SOURCE_LABELS`,
 * GK418/422/426/430). `general` orada "Genel"dir — ŞP mockup'ında bu kaynağın
 * rozeti çizilmemiştir, ama veri gelirse aynı sözcükle basılır.
 *
 * F-TB1 T5: `resolveWorkerSourceLabel` de aynı kaynaktan — `TimesheetTable`
 * artık ham `Record` erişimi (`WORKER_SOURCE_LABELS[row.source]`) YAPMAZ,
 * bilinmeyen bir değerde çökmek/ham enum basmak yerine bu çözümleyiciden
 * geçer. Rozet RENGİ de tek kaynaktan: `resolveSourceBadgeVariant`
 * (`src/components/personnel/personnel-list-labels.ts`) — `/personel`
 * listesiyle AYNI eşleme (Şirket mavi, Taşeron amber, geri kalanı nötr).
 */
export {
  WORKER_SOURCE_LABELS,
  resolveWorkerSourceLabel,
  WORKER_SOURCE_VALUES,
} from "@/components/site-diary/diary-labels";
export { resolveSourceBadgeVariant } from "@/components/personnel/personnel-list-labels";
