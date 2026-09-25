"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { formatDecimal } from "@/lib/format";
import type { EvPanelReport } from "@/lib/api/models";

import { bandIndexAt } from "../charts/scale";
import { HG_BASE, HG_LEFT, HG_RIGHT, HG_TOP, HG_VIEW_H, HG_VIEW_W, histogramGeometry } from "../charts/histogram-geometry";
import { useChartViewScale, toChartViewX } from "./panel-chart-hooks";
import "./panel-charts.css";

export interface PanelHistogramChartProps {
  histogram: EvPanelReport["histogram"];
  rangeLabel: string;
  actualBasis: EvPanelReport["actual_basis"];
}

const weekLabel = (week: EvPanelReport["histogram"][number]) => (week.week_no === null ? "?" : `H${week.week_no}`);

function weekTitle(week: EvPanelReport["histogram"][number]): string {
  if (week.week_no === null) return "Hafta";
  return `${weekLabel(week)} · ${week.week_start.slice(8, 10)}.${week.week_start.slice(5, 7)}–${(week.week_end ?? week.week_start).slice(8, 10)}.${(week.week_end ?? week.week_start).slice(5, 7)}`;
}

/**
 * PLN-F3.3 · İşçi histogramı · haftalık — Panel:321-345. Tooltip'te SAYILAR
 * (spec §1): "Planlı gereken N kişi · Gerçekleşen M kişi". Backend `week_no`/
 * `week_end` alanlarından etiketlenir — istemci hafta numarasını TÜRETMEZ.
 * `actual_basis === "equivalent"` → lejant "eşdeğer" notu taşır.
 */
export function PanelHistogramChart({ histogram, rangeLabel, actualBasis }: PanelHistogramChartProps) {
  const geo = histogramGeometry(histogram, weekLabel);
  const { ref, scale } = useChartViewScale(HG_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);

  if (geo.bars.length === 0) {
    return <p className="ev-panel-chart__empty">Haftalık dağılım yok.</p>;
  }

  const shownIndex = hover ?? (geo.today ? geo.bars.indexOf(geo.today) : geo.bars.length - 1);
  const shownBar = geo.bars[shownIndex];
  const shownRaw = histogram[shownIndex];
  const actualLabel = actualBasis === "equivalent" ? "Gerçekleşen (eşdeğer)" : "Gerçekleşen (puantaj)";

  return (
    <div className="ev-panel-chart-head">
      <div className="ev-panel-chart-head__row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <span className="ev-panel-chart-head__title">İşçi histogramı · haftalık · {rangeLabel}</span>
        <span className="ev-panel-chart-legend">
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--spent" />
            Planlı gereken (baseline)
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--earned" />
            {actualLabel}
          </span>
        </span>
      </div>
      <div className="ev-panel-chart">
        <svg
          ref={ref}
          viewBox={`0 0 ${HG_VIEW_W} ${HG_VIEW_H}`}
          className="ev-panel-chart__svg"
          role="img"
          aria-label="Haftalık işçi histogramı"
          onMouseMove={(event) => setHover(bandIndexAt(toChartViewX(event, HG_VIEW_W), geo.bars.length, HG_LEFT, HG_RIGHT))}
          onMouseLeave={() => setHover(null)}
        >
          {geo.yTicks.map((tick) => (
            <g key={tick.label}>
              <line x1={HG_LEFT} x2={HG_RIGHT} y1={tick.y} y2={tick.y} className="ev-panel-chart__grid" />
              <text x={30} y={tick.y + 4} textAnchor="end" className="ev-panel-chart__tick ev-panel-chart__tick--mono">
                {tick.label}
              </text>
            </g>
          ))}
          {geo.bars.map((bar, i) => (
            <g key={histogram[i]?.week_start ?? i}>
              <path d={bar.plannedPath} className="ev-panel-chart__bar-spent" />
              <path d={bar.actualPath} className="ev-panel-chart__bar-earned" />
            </g>
          ))}
          <line x1={HG_LEFT} x2={HG_RIGHT} y1={HG_BASE} y2={HG_BASE} className="ev-panel-chart__axis" />
          {geo.today && (
            <line x1={geo.today.x} x2={geo.today.x} y1={HG_TOP} y2={HG_BASE} className="ev-panel-chart__today" />
          )}
          {geo.xTicks.map((tick) => (
            <text key={tick.x} x={tick.x} y={HG_VIEW_H - 18} textAnchor="middle" className="ev-panel-chart__tick ev-panel-chart__tick--mono">
              {tick.label}
            </text>
          ))}
          <text x={HG_VIEW_W / 2} y={HG_VIEW_H - 4} textAnchor="middle" className="ev-panel-chart__caption">
            hafta · kişi = a-s ÷ (6 gün × 9 sa)
          </text>
        </svg>
        {shownBar && shownRaw && (
          <ChartTooltip
            x={Math.round((shownBar.x + 20) * scale)}
            y={Math.round(HG_TOP * scale)}
            title={weekTitle(shownRaw)}
            rows={[
              {
                label: "Planlı gereken",
                value: shownRaw.planned_people === null ? "" : `${formatDecimal(shownRaw.planned_people, 0)} kişi`,
              },
              {
                label: actualLabel,
                value: shownRaw.actual_people === null ? "" : `${formatDecimal(shownRaw.actual_people, 0)} kişi`,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
