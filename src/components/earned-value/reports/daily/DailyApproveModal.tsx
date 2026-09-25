"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button } from "@/components/ui/button";
import { backendErrorMessage } from "@/lib/api/error-message";
import { compareDecimalStrings } from "@/lib/earned-value";
import { formatDateDots, formatQuantity } from "@/lib/format";
import type { useApproveDailyReport } from "@/lib/api/hooks/useEvReports";

import { formatDayMonthDots, joinWithVe } from "./daily-logic";

import "./daily-approve-modal.css";

export interface DailyApproveModalProps {
  reportDate: string;
  /** `missing_diary_dates` — modal YALNIZ bunu taşır (F3-SÖZLEŞME §2, S10). */
  missingDiaryDates: readonly string[];
  /** GİR:396 ikinci cümle — `footer.undistributed_day` (F3.6b lider denetimi 5. tur, madde eki). */
  undistributedDay: string | null;
  approve: ReturnType<typeof useApproveDailyReport>;
  onClose: () => void;
  onApproved: () => void;
}

/**
 * PLN-F3.4 · Onay modalı — GİR:389-403. `draft_diary_dates` (taslak/gönderil-
 * memiş) burada DEĞİL: o durumda düğüm zaten PASİFTİR (S10, `daily-logic.ts`
 * `approveGate`), modal hiç açılmaz. Bu modal yalnız `missing_diary_dates`
 * (hiç günlük GÖNDERİLMEMİŞ günler) uyarır — onay yine de mümkündür.
 */
export function DailyApproveModal({
  reportDate,
  missingDiaryDates,
  undistributedDay,
  approve,
  onClose,
  onApproved,
}: DailyApproveModalProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    try {
      await approve.mutateAsync({ day: reportDate });
      onApproved();
    } catch (err: unknown) {
      setError(backendErrorMessage(err, "Rapor onaylanamadı."));
    }
  }

  return (
    <Modal
      title="Raporu onayla ve kilitle"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button aria-busy={approve.isPending || undefined} disabled={approve.isPending} onClick={() => void handleApprove()}>
            Onayla ve kilitle
          </Button>
        </>
      }
    >
      <p className="ev-daily-approve-modal__text">
        <b>{formatDateDots(reportDate)} ve öncesindeki günlük ve puantaj girişleri kilitlenecek.</b> Devam?
      </p>
      {missingDiaryDates.length > 0 && (
        <div className="ev-daily-approve-modal__warning" role="note">
          {joinWithVe(missingDiaryDates.map((d) => formatDayMonthDots(d)))} günlükleri hiç gönderilmedi; bu günler eksik
          veriyle kilitlenir.
          {undistributedDay !== null && compareDecimalStrings(undistributedDay, "0") > 0 && (
            <> {formatQuantity(undistributedDay)} a-s dağıtılmamış saat gerekçesiyle kayda geçer.</>
          )}
        </div>
      )}
      {error !== null && (
        <div className="ev-daily-approve-modal__error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
