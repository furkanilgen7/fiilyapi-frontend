"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button } from "@/components/ui/button";
import { backendErrorMessage } from "@/lib/api/error-message";
import { formatDateDots } from "@/lib/format";
import type { useApproveDailyReport } from "@/lib/api/hooks/useEvReports";

import "./daily-approve-modal.css";

export interface DailyApproveModalProps {
  reportDate: string;
  /** `missing_diary_dates` — modal YALNIZ bunu taşır (F3-SÖZLEŞME §2, S10). */
  missingDiaryDates: readonly string[];
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
export function DailyApproveModal({ reportDate, missingDiaryDates, approve, onClose, onApproved }: DailyApproveModalProps) {
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
          {missingDiaryDates.map((d) => formatDateDots(d)).join(", ")} günlükleri hiç gönderilmedi; bu günler eksik
          veriyle kilitlenir.
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
