import type { TimesheetSaveState } from "./useTimesheetEditor";

interface StatusLine {
  readonly text: string;
  readonly isFailure: boolean;
}

export interface TimesheetSaveStatusProps {
  dirtyCount: number;
  saveState: TimesheetSaveState;
  exportError: string | null;
}

/**
 * Kaydetme akışının GÖRÜNÜR sonucu (F-PT T3) — `PlanSaveStatus` deseni.
 *
 * Mockup'ta karşılığı yoktur (matris salt-okunur çizilmiştir); repo deseni
 * izlenir: kaydedilmemiş değişiklik SESSİZ kalmaz, hata gerekçesiyle yazılır,
 * "kaydedildi" ancak sunucu yazdıktan sonra çıkar.
 *
 * `role="alert"` KULLANILMAZ (F-P6 dersi; e2e'de yasak) — görünür metin yeter.
 */
export function TimesheetSaveStatus({
  dirtyCount,
  saveState,
  exportError,
}: TimesheetSaveStatusProps) {
  const lines: StatusLine[] = [];

  if (saveState.kind === "saving") {
    lines.push({ text: "Kaydediliyor…", isFailure: false });
  } else if (dirtyCount > 0) {
    lines.push({
      text: `Kaydedilmemiş ${dirtyCount} hücre değişikliği var — “Kaydet” ile yazın.`,
      isFailure: false,
    });
  } else if (saveState.kind === "saved") {
    lines.push({ text: "Puantaj kaydedildi.", isFailure: false });
  }

  if (saveState.kind === "failed") lines.push({ text: saveState.message, isFailure: true });
  if (exportError !== null) lines.push({ text: exportError, isFailure: true });

  if (lines.length === 0) return null;

  return (
    <div className="ts-save-status">
      {lines.map((line) => (
        <p
          key={line.text}
          className={
            line.isFailure
              ? "ts-save-status__line ts-save-status__line--failed"
              : "ts-save-status__line"
          }
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}
