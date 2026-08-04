import { cx } from "@/lib/cx";
import type {
  SitePlanCellRead,
  SitePlanDay,
  SitePlanGroup,
  SitePlanRowRead,
} from "@/lib/api/hooks/useSitePlan";

import { planCellsByDate, planGroupManagerText, planGroupTitle, planRowLabel } from "./grid-derive";
import { PLAN_CELL_TAG_LABELS } from "./plan-labels";
import { weekDayLabel } from "./week";

export interface PlanGridProps {
  days: readonly SitePlanDay[];
  groups: readonly SitePlanGroup[];
}

/** P127-133 · dolu hücrenin renk çipi. `tag` null ise ÇİP YOKTUR (aşağıya bak). */
function PlanCellChip({ cell }: { cell: SitePlanCellRead }) {
  if (cell.tag === null) {
    // TÜREV: mockup'ın altı çipinin hepsi renklidir; `tag` null bir hücre
    // çizilmemiştir. `gray` ile eşitlemek YANLIŞ olurdu — `gray` kullanıcının
    // SEÇTİĞİ bir renktir ("Bakım", P131) ve "renk seçilmemiş"le aynı şey
    // değildir. Bu yüzden zeminsiz düz metin basılır: plan görünür kalır,
    // sahte bir renk anlamı üretilmez.
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
function PlanGridRow({ row, days }: { row: SitePlanRowRead; days: readonly SitePlanDay[] }) {
  const cellsByDate = planCellsByDate(row);
  return (
    <div className="plan-grid__row">
      {/* P126 / P162 */}
      <div className="plan-grid__lead">{planRowLabel(row)}</div>
      {days.map((day) => {
        const cell = cellsByDate.get(day.plan_date);
        return (
          <div
            key={day.plan_date}
            className={cx("plan-grid__cell", day.is_weekend && "plan-grid__cell--weekend")}
          >
            {cell !== undefined && <PlanCellChip cell={cell} />}
          </div>
        );
      })}
    </div>
  );
}

/** P121-124 / P157-160 · grup başlığı satırı (mavi = bölüm, yeşil = ekipman). */
function PlanGridGroupHead({ group }: { group: SitePlanGroup }) {
  const managerText = planGroupManagerText(group);
  return (
    <div className={cx("plan-grid__row", "plan-grid__group", `plan-grid__group--${group.kind}`)}>
      {/* P122 / P158 */}
      <div className="plan-grid__group-title">{planGroupTitle(group)}</div>
      {/* P123 / P159 — kalan 7 sütunu kaplar; sorumlu yoksa boş kalır. */}
      <div className="plan-grid__group-meta">{managerText}</div>
    </div>
  );
}

/**
 * P109-181 · haftalık ızgaranın gövdesi (YALNIZ OKUMA — düzenleme T3'ün işi).
 *
 * Sütun iskeleti `days`ten gelir; hafta sonu vurgusu `is_weekend` alanından
 * okunur (haftanın gerçek gününden DEĞİL — hangi günün tatil sayıldığını
 * backend söyler).
 */
export function PlanGrid({ days, groups }: PlanGridProps) {
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

      {groups.map((group) => (
        <div
          className="plan-grid__group-block"
          key={`${group.kind}::${group.section_id ?? ""}`}
        >
          <PlanGridGroupHead group={group} />
          {group.rows.map((row) => (
            <PlanGridRow key={row.id} row={row} days={days} />
          ))}
        </div>
      ))}
    </div>
  );
}
