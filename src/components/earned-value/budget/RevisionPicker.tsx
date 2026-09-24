"use client";

import { useState } from "react";

import { AnchoredPopover } from "@/components/ui";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import type { EvBudgetView, EvRevisionOut } from "@/lib/api/models";

import { stopWhenOpen } from "./AssignmentCells";
import { revisionButtonLabel, revisionOption, type ScreenState } from "./revision-state";

const STATUS_ORDER: Record<EvRevisionOut["status"], number> = { draft: 0, active: 1, archived: 2 };

function ordered(revisions: readonly EvRevisionOut[]): EvRevisionOut[] {
  return [...revisions].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.number - a.number,
  );
}

interface RevisionPickerProps {
  view: EvBudgetView;
  revisions: readonly EvRevisionOut[];
  state: ScreenState;
  onSelect: (revision: EvRevisionOut) => void;
  onOpenDraft: () => void;
}

/**
 * Revizyon açılır listesi — Adam-Saat Bütçesi.dc.html:102-118 (düğme + liste)
 * + Ek Formlar M5 (a) "+ Taslak aç · Rev N" satırı (taslak yokken, draft yetkisi).
 */
export function RevisionPicker({ view, revisions, state, onSelect, onOpenDraft }: RevisionPickerProps) {
  const [open, setOpen] = useState(false);
  const currentId = view.revision?.id ?? null;
  const close = () => setOpen(false);

  return (
    <div className="ev-budget-rev">
      <button
        type="button"
        className="ev-budget-rev__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={revisions.length === 0 && !state.canOpenDraft}
        onMouseDown={stopWhenOpen(open)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ev-budget-rev__caption">Revizyon</span>
        <span className="ev-budget-rev__value">{revisionButtonLabel(view)}</span>
        <ChevronDownIcon width={14} height={14} aria-hidden="true" className="ev-budget-rev__chevron" />
      </button>
      {open && (
        <AnchoredPopover label="Revizyon seç" onClose={close} className="ev-budget-dd ev-budget-rev__menu">
          <RevisionMenu
            revisions={revisions}
            currentId={currentId}
            state={state}
            onPick={(rev) => {
              close();
              onSelect(rev);
            }}
            onOpenDraft={() => {
              close();
              onOpenDraft();
            }}
          />
        </AnchoredPopover>
      )}
    </div>
  );
}

interface RevisionMenuProps {
  revisions: readonly EvRevisionOut[];
  currentId: string | null;
  state: ScreenState;
  onPick: (revision: EvRevisionOut) => void;
  onOpenDraft: () => void;
}

function RevisionMenu({ revisions, currentId, state, onPick, onOpenDraft }: RevisionMenuProps) {
  return (
    <>
      {ordered(revisions).map((rev) => {
        const option = revisionOption(rev);
        const isCurrent = rev.id === currentId;
        return (
          <button
            key={rev.id}
            type="button"
            className={cx("ev-budget-dd__option", isCurrent && "ev-budget-dd__option--selected")}
            aria-current={isCurrent || undefined}
            onClick={() => onPick(rev)}
          >
            <span className="ev-budget-dd__label">{option.label}</span>
            <span className="ev-budget-dd__sub">{option.sub}</span>
          </button>
        );
      })}
      {state.canOpenDraft && (
        <>
          <div className="ev-budget-dd__divider" aria-hidden="true" />
          <button type="button" className="ev-budget-dd__option" onClick={onOpenDraft}>
            <span className="ev-budget-dd__label ev-budget-dd__label--action">+ Taslak aç · Rev {state.nextDraftNumber}</span>
            {state.active && <span className="ev-budget-dd__sub">Rev {state.active.number} kopyalanır</span>}
          </button>
        </>
      )}
    </>
  );
}
