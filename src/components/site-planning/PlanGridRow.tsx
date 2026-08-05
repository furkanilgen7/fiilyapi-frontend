"use client";

import { useState, type Dispatch } from "react";

import type { SitePlanDay } from "@/lib/api/hooks/useSitePlan";
import { cx } from "@/lib/cx";

import { planRowLabel } from "./grid-derive";
import type { PlanDraftCell, PlanDraftRow } from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";
import { PLAN_CELL_TAG_LABELS } from "./plan-labels";
import { PlanCellPopover } from "./PlanCellPopover";
import { PlanRowMenu } from "./PlanRowMenu";
import { weekDayLabel } from "./week";

export interface PlanGridRowProps {
  row: PlanDraftRow;
  days: readonly SitePlanDay[];
  canWrite: boolean;
  dispatch: Dispatch<PlanDraftAction>;
  /** Silme ONAY diyalogunu açar — satır hücreleriyle birlikte gideceği için zorunlu. */
  onRequestDelete: (row: PlanDraftRow) => void;
}

/** P127-133 · dolu hücrenin renk çipi. `tag` null ise ÇİP YOKTUR (aşağıya bak). */
function PlanCellChip({ cell }: { cell: PlanDraftCell }) {
  if (cell.tag === null) {
    // TÜREV: mockup'ın altı çipinin hepsi renklidir; `tag` null bir hücre
    // çizilmemiştir. `gray` ile eşitlemek YANLIŞ olurdu — `gray` kullanıcının
    // SEÇTİĞİ bir renktir ("Bakım", P131) ve "renk seçilmemiş"le aynı şey
    // değildir. Bu yüzden zeminsiz düz metin basılır.
    return <span className="plan-cell__chip plan-cell__chip--plain">{cell.text}</span>;
  }
  return (
    <span
      className={cx("plan-cell__chip", `plan-cell__chip--${cell.tag}`)}
      title={PLAN_CELL_TAG_LABELS[cell.tag]}
    >
      {cell.text}
    </span>
  );
}

/** P125-154 / P161-180 · tek bir kaynak satırı (ekip ya da ekipman). */
export function PlanGridRow({ row, days, canWrite, dispatch, onRequestDelete }: PlanGridRowProps) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const label = planRowLabel(row.label, row.plannedWorkerCount);

  return (
    <div className="plan-grid__row">
      {/* P126 / P162 */}
      <div className="plan-grid__lead">
        <span className="plan-grid__lead-text">{label}</span>
        <PlanRowMenu
          rowLabel={label}
          disabled={!canWrite}
          onDelete={() => onRequestDelete(row)}
        />
      </div>
      {days.map((day) => {
        const cell = row.cells[day.plan_date];
        const dayLabel = weekDayLabel(day.plan_date);
        const cellLabel = `${label} · ${dayLabel.weekday} ${dayLabel.dayMonth}`;
        return (
          <div
            key={day.plan_date}
            className={cx("plan-grid__cell", day.is_weekend && "plan-grid__cell--weekend")}
          >
            <span className="plan-pop-anchor plan-pop-anchor--cell">
              {canWrite ? (
                <button
                  type="button"
                  className="plan-cell__button"
                  aria-label={`${cellLabel} planı`}
                  onClick={() => setOpenDate(day.plan_date)}
                >
                  {cell !== undefined && <PlanCellChip cell={cell} />}
                </button>
              ) : (
                cell !== undefined && <PlanCellChip cell={cell} />
              )}
              {openDate === day.plan_date && (
                <PlanCellPopover
                  cell={cell ?? null}
                  label={cellLabel}
                  onClose={() => setOpenDate(null)}
                  onSubmit={(value) => {
                    dispatch({
                      type: "setCell",
                      rowKey: row.key,
                      planDate: day.plan_date,
                      cell: value,
                    });
                    setOpenDate(null);
                  }}
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
