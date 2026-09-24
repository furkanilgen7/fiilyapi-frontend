"use client";

import { Modal } from "@/components/settings/Modal";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatDateDots, toIstanbulDateOnly } from "@/lib/format";
import type { EvRevisionOut } from "@/lib/api/models";

import { formatMhr } from "./budget-format";
import type { DiffSummary } from "./diff-rows";
import { revDative } from "./revision-state";

interface FreezeModalProps {
  number: number;
  activeNumber: number | null;
  directTotal: string;
  diff: DiffSummary | null;
  emptyCount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Dondurma onayı — Adam-Saat Bütçesi.dc.html:447-468 + Ek Formlar M6 (c):
 * boş oran UYARIDIR, modalde kalır (engel değil).
 */
export function FreezeModal(props: FreezeModalProps) {
  const { number, activeNumber, diff, emptyCount } = props;
  const next = `değişiklikler Rev ${number + 1} taslağı olarak açılır.`;
  const text =
    activeNumber === null
      ? `Bu işlem geri alınamaz. Sonraki ${next}`
      : `Bu işlem geri alınamaz. Rev ${activeNumber} arşive geçer; sonraki ${next}`;
  return (
    <Modal
      title={`Rev ${number} baseline olarak dondurulsun mu?`}
      onClose={props.onCancel}
      className="ev-budget-modal"
      footer={
        <>
          <Button variant="secondary" onClick={props.onCancel}>
            Vazgeç
          </Button>
          <Button onClick={props.onConfirm} disabled={props.busy} aria-busy={props.busy || undefined}>
            Dondur
          </Button>
        </>
      }
    >
      <p className="ev-budget-modal__text">{text}</p>
      <dl className="ev-budget-modal__grid">
        <dt>Toplam doğrudan</dt>
        <dd className="ev-budget-mono ev-budget-strong">{formatMhr(props.directTotal)} a-s</dd>
        {diff && (
          <>
            <dt>{revDative(diff.againstNumber)} göre</dt>
            <dd className={cx("ev-budget-mono ev-budget-strong", `ev-budget-tone--${diff.tone}`)}>{diff.delta} a-s</dd>
            <dt>Değişen satır</dt>
            <dd className="ev-budget-mono">{diff.count}</dd>
          </>
        )}
      </dl>
      {emptyCount > 0 && (
        <p className="ev-budget-modal__warn">
          <b>{emptyCount} kalem oranı boş.</b> Bu satırlar bütçeye 0 a-s ile girer ve kazanılmış hesaplanamaz.
        </p>
      )}
    </Modal>
  );
}

interface DeleteDraftModalProps {
  draft: EvRevisionOut;
  activeNumber: number | null;
  changedCount: number | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Taslak silme onayı — Ek Formlar M5 (c). */
export function DeleteDraftModal({ draft, activeNumber, changedCount, busy, onCancel, onConfirm }: DeleteDraftModalProps) {
  const name = draft.name ? `"${draft.name}"` : `Rev ${draft.number} taslağı`;
  return (
    <Modal
      title={`Rev ${draft.number} taslağı silinsin mi?`}
      onClose={onCancel}
      className="ev-budget-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
            Taslağı sil
          </Button>
        </>
      }
    >
      <p className="ev-budget-modal__text">
        <b>{name}</b> silinecek. Bu işlem geri alınamaz.
        {activeNumber !== null && ` Aktif baseline Rev ${activeNumber} değişmez.`}
      </p>
      <dl className="ev-budget-modal__grid">
        <dt>Son düzenleme</dt>
        <dd className="ev-budget-mono">{formatDateDots(toIstanbulDateOnly(draft.last_edited_at))}</dd>
        {activeNumber !== null && changedCount !== null && (
          <>
            <dt>{revDative(activeNumber)} göre değişen satır</dt>
            <dd className="ev-budget-mono ev-budget-strong">{changedCount}</dd>
          </>
        )}
      </dl>
    </Modal>
  );
}
