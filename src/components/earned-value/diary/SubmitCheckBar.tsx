"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input/Input";
import { CheckIcon, WarningTriangleIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";

import type { SubmitCheck, SubmitState } from "./submit-checks";

export interface SubmitCheckBarProps {
  state: SubmitState;
  reason: string;
  canEditReason: boolean;
  onReasonChange: (reason: string) => void;
}

/**
 * Gönder kontrol çubuğu — İ:493-510 (+ Ek Formlar "(b)"). Düğmenin KENDİSİ
 * çekirdeğindir (`submitGate` ile kapı verilir, K15 metni "Gönder"); burada
 * kontrol çipleri, not ve dağıtılmamış saat gerekçesi (K14) durur.
 */
export function SubmitCheckBar({ state, reason, canEditReason, onReasonChange }: SubmitCheckBarProps) {
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
