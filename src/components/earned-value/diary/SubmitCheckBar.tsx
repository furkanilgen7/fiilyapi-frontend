"use client";

import { useState } from "react";

import type { DiaryCoreActions } from "@/components/site-diary/diary-extension";
import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { CheckIcon, WarningTriangleIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";

import type { SubmitCheck, SubmitState } from "./submit-checks";

export interface SubmitCheckBarProps {
  state: SubmitState;
  reason: string;
  canEditReason: boolean;
  onReasonChange: (reason: string) => void;
  /** Çekirdeğin eylemleri (karar 6) — "Gönder" başlıktaki "Kaydet & Gönder" akışının AYNISI. */
  actions: DiaryCoreActions;
}

/**
 * Gönder kontrol çubuğu — İ:493-510 (+ Ek Formlar "(b)"): kontrol çipleri, not,
 * "Gönder" (İ:504, notun sağı; K15 metni — mockup'taki "Gönder ve günü kilitle"
 * DEĞİL) ve dağıtılmamış saat gerekçesi (K14). Gönder çekirdeğin `submit`ini
 * çağırır, etkinliği çekirdeğin `canSubmit`idir (karar 6). Tablette aynı eylem
 * alt eylem çubuğundadır; buradaki düğme orada gizlenir (F2.6).
 */
export function SubmitCheckBar({ state, reason, canEditReason, onReasonChange, actions }: SubmitCheckBarProps) {
  const [isReasonOpen, setReasonOpen] = useState(reason.trim() !== "");
  const showReason = isReasonOpen || reason.trim() !== "";
  return (
    <section className="ev-diary-submit" aria-label="Gönder kontrolü">
      <ul className="ev-diary-submit__checks">
        {state.checks.map((item) => (
          <CheckChip
            key={item.key}
            item={item}
            canWriteReason={canEditReason}
            onWriteReason={() => setReasonOpen((open) => !open)}
          />
        ))}
      </ul>
      <span className={cx("ev-diary-submit__note", `ev-diary-tone--${state.note.tone}`)}>{state.note.text}</span>
      <SendButton actions={actions} className="ev-diary-desktop-only" />
      {showReason && (
        <div className="ev-diary-submit__reason">
          <Input
            aria-label="Dağıtılmamış saat gerekçesi"
            placeholder="Dağıtılmamış saat gerekçesi (örn. yardımcılar genel temizlikte, kod açılacak)"
            className="ev-diary-submit__reason-input"
            disabled={!canEditReason}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </div>
      )}
    </section>
  );
}

function CheckChip({ item, canWriteReason, onWriteReason }: { item: SubmitCheck; canWriteReason: boolean; onWriteReason: () => void }) {
  return (
    <li className={cx("ev-diary-check", `ev-diary-check--${item.tone}`)}>
      <span className="ev-diary-check__dot" aria-hidden="true">
        {item.tone === "ok" ? <CheckIcon /> : <WarningTriangleIcon />}
      </span>
      {item.label}
      {item.canWriteReason && (
        <button type="button" className="ev-diary-check__link" disabled={!canWriteReason} onClick={onWriteReason}>
          gerekçe yaz
        </button>
      )}
    </li>
  );
}

/** "Gönder" — kontrol çubuğu (İ:504) ve tablet eylem çubuğu (İ:552) ortak düğmesi. */
export function SendButton({ actions, className }: { actions: DiaryCoreActions; className?: string }) {
  return (
    <Button
      variant="success"
      className={cx("ev-diary-send", className)}
      disabled={!actions.canSubmit}
      aria-busy={actions.isSaving || undefined}
      onClick={() => actions.submit()}
    >
      Gönder
    </Button>
  );
}
