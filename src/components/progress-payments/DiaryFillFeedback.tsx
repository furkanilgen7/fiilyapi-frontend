"use client";

import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { Alert } from "@/components/ui";

import { diaryOverwriteConfirmMessage, type DiaryFillNotice } from "./diary-fill";

export interface DiaryFillFeedbackProps {
  notice: DiaryFillNotice | null;
  /** `null` = onay penceresi kapalı. */
  confirmOverwriteCount: number | null;
  onConfirmOverwrite: () => void;
  onCancelOverwrite: () => void;
  /** Uyarı/`ConfirmDialog` için test kancası öneki (iki form ayrı ayrı hedeflenebilsin). */
  testIdPrefix: string;
}

/**
 * F-SD T5 · "Günlükten Doldur" geri bildirimi — iki hakediş formunda AYNI
 * bileşen. İki parça: (a) sonucun görünür Türkçe özeti (atlanan poz, boş
 * öneri, hata, eşleşmeyen satır — hiçbiri sessiz değil), (b) üzerine yazma
 * onay penceresi (mevcut `ConfirmDialog` deseni, `Fiyatları Tazele` ile aynı).
 */
export function DiaryFillFeedback({
  notice,
  confirmOverwriteCount,
  onConfirmOverwrite,
  onCancelOverwrite,
  testIdPrefix,
}: DiaryFillFeedbackProps) {
  return (
    <>
      {notice && (
        <Alert
          variant={notice.variant}
          className="pp-form__alert"
          data-testid={`${testIdPrefix}-diary-fill-notice`}
        >
          {notice.text}
        </Alert>
      )}

      {confirmOverwriteCount !== null && (
        <ConfirmDialog
          title="Günlükten Doldur"
          message={diaryOverwriteConfirmMessage(confirmOverwriteCount)}
          confirmLabel="Üzerine yaz"
          danger
          onConfirm={onConfirmOverwrite}
          onClose={onCancelOverwrite}
        />
      )}
    </>
  );
}
