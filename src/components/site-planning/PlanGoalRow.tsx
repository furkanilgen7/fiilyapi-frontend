"use client";

import type { Dispatch } from "react";

import { Checkbox } from "@/components/ui/checkbox/Checkbox";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import type { PlanGoalStatus } from "@/lib/api/hooks/useSitePlan";
import { cx } from "@/lib/cx";

import type { PlanDraftGoal } from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";
import { PLAN_GOAL_STATUS_LABELS } from "./plan-labels";
import { PlanRowMenu } from "./PlanRowMenu";

/** Başlık/not tavanları: hedef satırı kartın tek satırıdır (P206-209). */
const MAX_GOAL_TITLE = 120;
const MAX_GOAL_NOTE = 200;

const GOAL_STATUSES = Object.keys(PLAN_GOAL_STATUS_LABELS) as PlanGoalStatus[];

export interface PlanGoalRowProps {
  goal: PlanDraftGoal;
  canWrite: boolean;
  dispatch: Dispatch<PlanDraftAction>;
}

/**
 * P206-209 · tek hedef satırı (F-PL T3'te DÜZENLENEBİLİR).
 *
 * ⚠️ `is_done` (kutucuk) ile `status` (rozet) AYRI alanlardır ve biri
 * diğerinden TÜRETİLMEZ — kutucuğu işaretlemek durumu "Tamamlandı" YAPMAZ.
 *
 * Görsel dil mockup'ta kalır: başlık/not kontrolleri zeminsiz ve kenarlıksız
 * çizilir (odak/üzerine gelme dışında), durum kontrolü de rozetin TA KENDİSİ
 * gibi görünür (`plan-goals__status--*` renkleri). Böylece yazma izni olmayan
 * kullanıcı mockup'ın statik listesini görür, olan kullanıcı aynı yüzeyde yazar.
 */
export function PlanGoalRow({ goal, canWrite, dispatch }: PlanGoalRowProps) {
  const rowLabel = goal.title.trim().length > 0 ? goal.title : "Yeni hedef";

  return (
    <li className="plan-goals__row">
      {/* P207 */}
      <Checkbox
        className="plan-goals__check"
        checked={goal.isDone}
        disabled={!canWrite}
        aria-label={`${rowLabel} — tamamlandı işareti`}
        onChange={(event) =>
          dispatch({
            type: "updateGoal",
            goalKey: goal.key,
            patch: { isDone: event.target.checked },
          })
        }
      />
      {/* P208 */}
      <div className="plan-goals__body">
        <Input
          size="row"
          className="plan-goals__title-input"
          value={goal.title}
          maxLength={MAX_GOAL_TITLE}
          disabled={!canWrite}
          placeholder="Hedef başlığı"
          aria-label={`${rowLabel} — hedef başlığı`}
          onChange={(event) =>
            dispatch({ type: "updateGoal", goalKey: goal.key, patch: { title: event.target.value } })
          }
        />
        <Input
          size="row"
          className="plan-goals__note-input"
          value={goal.note}
          maxLength={MAX_GOAL_NOTE}
          disabled={!canWrite}
          placeholder="Not (isteğe bağlı)"
          aria-label={`${rowLabel} — hedef notu`}
          onChange={(event) =>
            dispatch({ type: "updateGoal", goalKey: goal.key, patch: { note: event.target.value } })
          }
        />
      </div>
      {/* P209 — rozet ölçüleri, kontrol davranışı */}
      <Select
        size="row"
        className={cx("plan-goals__status-select", `plan-goals__status--${goal.status}`)}
        value={goal.status}
        disabled={!canWrite}
        aria-label={`${rowLabel} — hedef durumu`}
        onChange={(event) =>
          dispatch({
            type: "updateGoal",
            goalKey: goal.key,
            patch: { status: event.target.value as PlanGoalStatus },
          })
        }
      >
        {GOAL_STATUSES.map((status) => (
          <option key={status} value={status}>
            {PLAN_GOAL_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <PlanRowMenu
        rowLabel={rowLabel}
        disabled={!canWrite}
        onDelete={() => dispatch({ type: "removeGoal", goalKey: goal.key })}
      />
    </li>
  );
}
