"use client";

import { Button } from "@/components/ui";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  errorText?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  danger,
  isPending,
  errorText,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="settings-note">{message}</p>
      {errorText && <p className="settings-note settings-note--error">{errorText}</p>}
    </Modal>
  );
}
