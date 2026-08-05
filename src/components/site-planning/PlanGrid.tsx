"use client";

import { useState, type Dispatch } from "react";

import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import type { SitePlanDay } from "@/lib/api/hooks/useSitePlan";
import { cx } from "@/lib/cx";

import { planGroupManagerText, planGroupTitle, planRowLabel } from "./grid-derive";
import {
  planDraftRowsOfGroup,
  type PlanDraft,
  type PlanDraftGroup,
  type PlanDraftRow,
} from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";
import type { PlanSectionsState } from "./plan-sections";
import { PlanAddRowButton } from "./PlanAddRowButton";
import { PlanGridRow } from "./PlanGridRow";
import { weekDayLabel } from "./week";
import "@/components/settings/settings.css";

export interface PlanGridProps {
  days: readonly SitePlanDay[];
  draft: PlanDraft;
  sections: PlanSectionsState;
  canWrite: boolean;
  dispatch: Dispatch<PlanDraftAction>;
}

interface GroupHeadProps {
  group: PlanDraftGroup;
  sections: PlanSectionsState;
  canWrite: boolean;
  dispatch: Dispatch<PlanDraftAction>;
}

/** P121-124 / P157-160 · grup başlığı satırı (mavi = bölüm, yeşil = ekipman). */
function PlanGridGroupHead({ group, sections, canWrite, dispatch }: GroupHeadProps) {
  const title = planGroupTitle(group.kind, group.sectionName);

  return (
    <div className={cx("plan-grid__row", "plan-grid__group", `plan-grid__group--${group.kind}`)}>
      {/* P122 / P158 */}
      <div className="plan-grid__group-title">{title}</div>
      {/* P123 / P159 — kalan 7 sütunu kaplar; sorumlu yoksa boş kalır. */}
      <div className="plan-grid__group-meta">
        <span>{planGroupManagerText(group.sectionManagerName)}</span>
        <PlanAddRowButton
          defaultKind={group.kind}
          defaultSectionId={group.sectionId}
          sections={sections}
          canWrite={canWrite}
          onAdd={(row) => dispatch({ type: "addRow", row })}
        />
      </div>
    </div>
  );
}

/**
 * P109-181 · haftalık ızgaranın gövdesi.
 *
 * Sütun iskeleti `days`ten gelir; hafta sonu vurgusu `is_weekend` alanından
 * okunur (haftanın gerçek gününden DEĞİL — hangi günün tatil sayıldığını
 * backend söyler). Satırlar/hücreler YEREL TASLAKTAN çizilir: düzenlemeler
 * anında görünür, sunucuya ancak "Kaydet" ile gider.
 *
 * Satır silme ONAY diyalogundan geçer — satırla birlikte hücreleri de gider
 * (backend CASCADE), yani geri alınamaz bir kayıp söz konusudur.
 */
export function PlanGrid({ days, draft, sections, canWrite, dispatch }: PlanGridProps) {
  const [pendingDelete, setPendingDelete] = useState<PlanDraftRow | null>(null);

  return (
    <div className="plan-grid">
      {/* P110-117 — başlık satırı */}
      <div className="plan-grid__row plan-grid__row--head">
        <div className="plan-grid__lead plan-grid__lead--head">Bölüm / Ekip</div>
        {days.map((day) => {
          const label = weekDayLabel(day.plan_date);
          return (
            <div
              key={day.plan_date}
              className={cx("plan-grid__day", day.is_weekend && "plan-grid__day--weekend")}
            >
              <span className="plan-grid__day-name">{label.weekday}</span>
              <span className="plan-grid__day-date">{label.dayMonth}</span>
            </div>
          );
        })}
      </div>

      {draft.groups.map((group) => (
        <div className="plan-grid__group-block" key={group.key}>
          <PlanGridGroupHead
            group={group}
            sections={sections}
            canWrite={canWrite}
            dispatch={dispatch}
          />
          {planDraftRowsOfGroup(draft, group).map((row) => (
            <PlanGridRow
              key={row.key}
              row={row}
              days={days}
              canWrite={canWrite}
              dispatch={dispatch}
              onRequestDelete={setPendingDelete}
            />
          ))}
        </div>
      ))}

      {pendingDelete !== null && (
        <ConfirmDialog
          title="Plan satırını sil"
          message={`"${planRowLabel(pendingDelete.label, pendingDelete.plannedWorkerCount)}" satırı ve bu satırın TÜM hücreleri silinecek. Değişiklik "Kaydet" ile kalıcı olur.`}
          confirmLabel="Sil"
          danger
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            dispatch({ type: "removeRow", rowKey: pendingDelete.key });
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
