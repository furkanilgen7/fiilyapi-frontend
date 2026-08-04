"use client";

import type { Dispatch } from "react";

import { Button } from "@/components/ui/button/Button";

import type { PlanDraftGoal } from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";
import { PlanGoalRow } from "./PlanGoalRow";

export interface PlanGoalsCardProps {
  goals: readonly PlanDraftGoal[];
  canWrite: boolean;
  dispatch: Dispatch<PlanDraftAction>;
}

/**
 * P203-227 · "🎯 Haftalık Hedefler" kartı.
 *
 * Yeni hedef "Beklemede" durumuyla açılır: kullanıcı henüz hiçbir şey
 * söylemeden "Devam Ediyor" demek yanlış bilgi olurdu.
 */
export function PlanGoalsCard({ goals, canWrite, dispatch }: PlanGoalsCardProps) {
  return (
    <section className="plan-card" aria-labelledby="plan-goals-title">
      {/* P204 */}
      <h2 className="plan-card__title" id="plan-goals-title">
        🎯 Haftalık Hedefler
      </h2>

      {goals.length === 0 ? (
        <p className="plan__message">Bu hafta için hedef girilmemiş.</p>
      ) : (
        <ul className="plan-goals">
          {goals.map((goal) => (
            <PlanGoalRow key={goal.key} goal={goal} canWrite={canWrite} dispatch={dispatch} />
          ))}
        </ul>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="plan-goals__add"
        disabled={!canWrite}
        onClick={() => dispatch({ type: "addGoal", status: "waiting" })}
      >
        + Hedef
      </Button>
    </section>
  );
}
