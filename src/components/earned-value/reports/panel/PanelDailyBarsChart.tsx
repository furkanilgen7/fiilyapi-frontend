"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { formatDateDots, formatDecimal } from "@/lib/format";
import type { EvPanelReport } from "@/lib/api/models";

import { bandIndexAt } from "../charts/scale";
import { D_BASE, D_LEFT, D_RIGHT, D_TOP, D_VIEW_H, D_VIEW_W, dailyBarsGeometry } from "../charts/daily-bars-geometry";
import { useChartViewScale, toChartViewX } from "./panel-chart-hooks";
import "./panel-charts.css";

export interface PanelDailyBarsChartProps {
  bars: EvPanelReport["bars"];
}

const dayShort = (day: string) => formatDateDots(day).slice(0, 5);

/**
 * PLN-F3.3 · Günlük kazanılmış vs harcanan (son 4 hafta) — Panel:260-288.
 * Tatil tarama `<pattern>`, "gönderilmedi" turuncu nokta. İpucu: fare
 * üstündeyse o gün, değilse DURAĞAN bugün.
 */
export function PanelDailyBarsChart({ bars }: PanelDailyBarsChartProps) {
  const geo = dailyBarsGeometry(bars, dayShort);
  const { ref, scale } = useChartViewScale(D_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);

  if (geo.bars.length === 0) {
    return <p className="ev-panel-chart__empty">Günlük veri yok.</p>;
  }

  const shownIndex = hover ?? (geo.today ? geo.bars.indexOf(geo.today) : null);
  const shownBar = shownIndex !== null ? geo.bars[shownIndex] : undefined;
  const shownRaw = shownIndex !== null ? bars[shownIndex] : undefined;

  return (
    <div className="ev-panel-chart-head">
      <div className="ev-panel-chart-head__row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <span className="ev-panel-chart-head__title">Günlük kazanılmış vs harcanan · son 4 hafta</span>
        <span className="ev-panel-chart-legend">
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--earned" />
            Kazanılmış
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--spent" />
            Harcanan
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__hatch" />
            Tatil
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__dot ev-panel-chart-legend__dot--unsent" />
            Gönderilmedi
          </span>
        </span>
      </div>
      <div className="ev-panel-chart">
        <svg
          ref={ref}
          viewBox={`0 0 ${D_VIEW_W} ${D_VIEW_H}`}
          className="ev-panel-chart__svg"
          role="img"
          aria-label="Günlük kazanılmış ve harcanan saat"
          onMouseMove={(event) => setHover(bandIndexAt(toChartViewX(event, D_VIEW_W), geo.bars.length, D_LEFT, D_RIGHT))}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="ev-panel-holiday-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="ev-panel-chart__hatch-bg" />
              <line x1="0" y1="0" x2="0" y2="5" className="ev-panel-chart__hatch-line" strokeWidth="2" />
            </pattern>
          </defs>
          {geo.yTicks.map((tick) => (
            <g key={tick.label}>
              <line x1={D_LEFT} x2={D_RIGHT} y1={tick.y} y2={tick.y} className="ev-panel-chart__grid" />
              <text x={30} y={tick.y + 4} textAnchor="end" className="ev-panel-chart__tick ev-panel-chart__tick--mono">
                {tick.label}
              </text>
            </g>
          ))}
          <path d={geo.holidayPath} fill="url(#ev-panel-holiday-hatch)" />
          {geo.bars.map((bar) => (
            <g key={bar.day}>
              <path d={bar.earnedPath} className="ev-panel-chart__bar-earned" />
              <path d={bar.spentPath} className="ev-panel-chart__bar-spent" />
            </g>
          ))}
          <line x1={D_LEFT} x2={D_RIGHT} y1={D_BASE} y2={D_BASE} className="ev-panel-chart__axis" />
          {geo.unsentDots.map((dot) => (
            <circle key={dot.day} cx={dot.x} cy={D_BASE + 7} r={3} className="ev-panel-chart__unsent-dot" />
          ))}
          {geo.xTicks.map((tick) => (
            <text key={tick.x} x={tick.x} y={D_VIEW_H - 10} textAnchor="middle" className="ev-panel-chart__tick">
              {tick.label}
            </text>
          ))}
        </svg>
        {shownBar && shownRaw && (
          <ChartTooltip
            x={Math.round((shownBar.x + 12) * scale)}
            y={Math.round(D_TOP * scale)}
            title={`${dayShort(shownRaw.day)} · Bugün`}
            rows={[
              { label: "Kazanılmış", value: shownRaw.earned_day === null ? "" : formatDecimal(shownRaw.earned_day, 0) },
              { label: "Harcanan", value: shownRaw.spent_day === null ? "" : formatDecimal(shownRaw.spent_day, 0) },
            ]}
          />
        )}
      </div>
    </div>
  );
}
