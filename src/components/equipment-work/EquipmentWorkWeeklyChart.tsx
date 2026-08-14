import { formatDecimal } from "@/lib/format";
import type { WorkSummaryWeek } from "@/lib/api/hooks/useEquipmentWorkSummary";

import "./equipment-work.css";

export interface EquipmentWorkWeeklyChartProps {
  weeks: WorkSummaryWeek[] | undefined;
  isLoading: boolean;
}

// M3 221-239 · SVG ölçüleri mockup'tan BİREBİR: viewBox 300×100, ilk çubuk
// x=10, çubuk genişliği 34, adım 48 (58-10), taban y=90, en yüksek çubuk
// y=10 ⇒ 80 birim. Ayda en çok 6 hafta kovası olur: 10+5×48+34 = 284 < 300,
// yani sabit adım altıncı kovada da taşmaz.
const BAR_X0 = 10;
const BAR_STEP = 48;
const BAR_WIDTH = 34;
const BASELINE_Y = 90;
const MAX_BAR_HEIGHT = 80;
const LABEL_Y = 98;
const VALUE_GAP = 4;

/** Çubuk yüksekliği — ORAN yalnız GÖSTERİMDİR, veri sunucunundur. */
function barHeight(hours: string, maxHours: number): number {
  if (maxHours <= 0) return 0;
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round((MAX_BAR_HEIGHT * value) / maxHours);
}

/**
 * M3 219-243 · "Haftalık Çalışma Saati" mini grafiği.
 *
 * Renk `dominant_record_type` SUNUCU DAMGASINDAN gelir (MK-1 `WorkSummaryWeek`
 * açıklaması): istemci kendi eşiğiyle boyamaz. Kayıtsız hafta (`null`) nötr
 * basılır — uydurma bir "çalışıyor" damgası konmaz.
 */
export function EquipmentWorkWeeklyChart({ weeks, isLoading }: EquipmentWorkWeeklyChartProps) {
  const maxHours = (weeks ?? []).reduce((max, week) => Math.max(max, Number(week.hours) || 0), 0);

  return (
    <section className="makine-cal-panel makine-cal-panel--pad" data-testid="makine-cal-weekly">
      {/* 220 */}
      <h2 className="makine-cal-panel__title makine-cal-panel__title--plain">
        Haftalık Çalışma Saati
      </h2>

      {isLoading && <p className="makine-cal-panel__note">Yükleniyor…</p>}
      {!isLoading && weeks?.length === 0 && (
        <p className="makine-cal-panel__note">Bu dönemde hafta kovası yok.</p>
      )}

      {weeks !== undefined && weeks.length > 0 && (
        <svg
          viewBox="0 0 300 100"
          className="makine-cal-chart"
          preserveAspectRatio="none"
          role="img"
          aria-label="Haftalık çalışma saati grafiği"
        >
          {weeks.map((week, index) => {
            const height = barHeight(week.hours, maxHours);
            const x = BAR_X0 + index * BAR_STEP;
            const centerX = x + BAR_WIDTH / 2;
            const top = BASELINE_Y - height;
            const tone =
              week.dominant_record_type === "breakdown"
                ? "breakdown"
                : week.dominant_record_type === "worked"
                  ? "worked"
                  : "empty";

            return (
              <g key={week.index} data-testid="makine-cal-week">
                {height > 0 && (
                  <rect
                    x={x}
                    y={top}
                    width={BAR_WIDTH}
                    height={height}
                    rx={4}
                    className={`makine-cal-chart__bar makine-cal-chart__bar--${tone}`}
                  />
                )}
                {/* 228-232 — hafta etiketi */}
                <text
                  x={centerX}
                  y={LABEL_Y}
                  textAnchor="middle"
                  className={`makine-cal-chart__label makine-cal-chart__label--${tone}`}
                >
                  H{week.index}
                </text>
                {/* 234-238 — saat değeri (SUNUCUDAN) */}
                <text
                  x={centerX}
                  y={top - VALUE_GAP}
                  textAnchor="middle"
                  className={`makine-cal-chart__value makine-cal-chart__value--${tone}`}
                >
                  {formatDecimal(week.hours, 2)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* 240-243 — gösterge */}
      <div className="makine-cal-legend">
        <span className="makine-cal-legend__item">
          <span className="makine-cal-legend__swatch makine-cal-legend__swatch--worked" />
          Çalışıyor
        </span>
        <span className="makine-cal-legend__item">
          <span className="makine-cal-legend__swatch makine-cal-legend__swatch--breakdown" />
          Bakım/Arıza
        </span>
      </div>
    </section>
  );
}
