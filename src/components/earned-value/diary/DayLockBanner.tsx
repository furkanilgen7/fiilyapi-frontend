"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button } from "@/components/ui/button/Button";
import { Field } from "@/components/ui/field/Field";
import { Textarea } from "@/components/ui/textarea/Textarea";
import { useUnlockDay } from "@/lib/api/hooks/useEvDayMutations";
import { backendErrorMessage } from "@/lib/api/error-message";
import type { EvDayLock } from "@/lib/api/models";
import { formatDateDots } from "@/lib/format";

export interface DayLockBannerProps {
  siteId: string;
  day: string;
  lock: EvDayLock;
  canUnlock: boolean;
}

/**
 * Kilit bandının İÇERİĞİ — İ:143-149: "Bu gün 25.09.2026 raporuyla kilitlendi.
 * Bütün alanlar salt okunur." + "Kilidi aç (yetkili)" (approve, K17). Çerçeve
 * ve kilit ikonu çekirdeğin durum satırındadır (`diary__lock-banner`); burada
 * yalnız metin + eylem. Kilit rapor ONAYIYLA gelir (K15: Gönder kilitlemez);
 * açma GÜN düzeyi istisnadır (B2-6).
 */
export function DayLockBanner({ siteId, day, lock, canUnlock }: DayLockBannerProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const reportText = lock.report_date ? `Bu gün ${formatDateDots(lock.report_date)} raporuyla kilitlendi.` : "Bu gün rapor onayıyla kilitlendi.";
  return (
    <>
      <span className="ev-diary-lock__text">
        <b>{reportText}</b> Bütün alanlar salt okunur.
      </span>
      {canUnlock && (
        <Button variant="secondary" className="ev-diary-lock__action" onClick={() => setModalOpen(true)}>
          Kilidi aç (yetkili)
        </Button>
      )}
      {isModalOpen && <UnlockDayModal siteId={siteId} day={day} onClose={() => setModalOpen(false)} />}
    </>
  );
}

/** Gerekçe modalı — `settings/Modal` + `ui` primitive'leri; `POST …/unlock` (approve). */
function UnlockDayModal({ siteId, day, onClose }: { siteId: string; day: string; onClose: () => void }) {
  const unlock = useUnlockDay(siteId, day);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canConfirm = reason.trim() !== "" && !unlock.isPending;

  async function handleConfirm() {
    setError(null);
    try {
      await unlock.mutateAsync(reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(backendErrorMessage(err, "Günün kilidi açılamadı."));
    }
  }

  return (
    <Modal
      title="Günün kilidini aç"
      onClose={onClose}
      isDirty={reason.trim() !== ""}
      className="ev-diary-unlock"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button disabled={!canConfirm} aria-busy={unlock.isPending || undefined} onClick={() => void handleConfirm()}>
            Kilidi aç
          </Button>
        </>
      }
    >
      <p className="ev-diary-unlock__text">
        {formatDateDots(day)} günlüğü ve puantajı yalnız bu gün için açılır. O tarihi kapsayan rapor yeniden
        onaylanınca gün yeniden kilitlenir.
      </p>
      <Field label="Gerekçe" required error={error ?? undefined}>
        {(control) => (
          <Textarea {...control} rows={3} value={reason} placeholder="Neden açılıyor? (örn. puantaj düzeltmesi)" onChange={(e) => setReason(e.target.value)} />
        )}
      </Field>
    </Modal>
  );
}
