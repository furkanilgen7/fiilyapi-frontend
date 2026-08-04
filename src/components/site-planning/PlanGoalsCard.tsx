import { Checkbox } from "@/components/ui/checkbox/Checkbox";
import type { SitePlanGoalRead } from "@/lib/api/hooks/useSitePlan";

import { PLAN_GOAL_STATUS_LABELS } from "./plan-labels";

export interface PlanGoalsCardProps {
  goals: readonly SitePlanGoalRead[];
}

/**
 * P203-227 · "🎯 Haftalık Hedefler" kartı — bu task'ta SALT-OKUNUR.
 *
 * Kutucuk (P207) `disabled` basılır: hedefin tamamlanma durumu ancak
 * `PUT …/plan/goals` ile yazılır ve o etkileşim T3'ün işidir; şimdilik
 * tıklanabilir görünüp hiçbir şey yapmayan bir kutucuk yalan söylerdi.
 * Ham `<input type="checkbox">` YASAK — `ui/checkbox` primitive'i kullanılır.
 *
 * `is_done` (kutucuk) ile `status` (rozet) AYRI alanlardır ve biri diğerinden
 * TÜRETİLMEZ — şema notu ve mockup ikisini bağımsız gösterir.
 */
export function PlanGoalsCard({ goals }: PlanGoalsCardProps) {
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
            <li className="plan-goals__row" key={goal.id}>
              {/* P207 */}
              <Checkbox
                className="plan-goals__check"
                checked={goal.is_done}
                disabled
                aria-label={`${goal.title} — tamamlandı işareti`}
                readOnly
              />
              {/* P208 */}
              <div className="plan-goals__body">
                <span className="plan-goals__title">{goal.title}</span>
                {goal.note !== null && goal.note.length > 0 && (
                  <span className="plan-goals__note">{goal.note}</span>
                )}
              </div>
              {/* P209 */}
              <span className={`plan-goals__status plan-goals__status--${goal.status}`}>
                {PLAN_GOAL_STATUS_LABELS[goal.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
