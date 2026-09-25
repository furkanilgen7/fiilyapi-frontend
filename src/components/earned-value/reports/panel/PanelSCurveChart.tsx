"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { formatDateDots, formatDateLong } from "@/lib/format";
import { formatPercent01, formatVariancePoints } from "@/lib/earned-value";
import type { EvPanelReport } from "@/lib/api/models";

import { indexAt } from "../charts/scale";
import { S_BASE, S_LEFT, S_RIGHT, S_TOP, S_VIEW_H, S_VIEW_W, sCurveGeometry } from "../charts/s-curve-geometry";
import { useChartViewScale, toChartViewX } from "./panel-chart-hooks";
import "./panel-charts.css";

export interface PanelSCurveChartProps {
  sCurve: EvPanelReport["s_curve"];
  revisionNumber: number | null;
}

/**
 * PLN-F3.3 · S-eğrisi · kümülatif ilerleme — Panel:185-222. Lejant, renkler
 * ve viewBox mockup'la BİREBİR. İpucu: fare üstündeyse o gün, değilse
 * DURAĞAN "Bugün" (emsal `budget/PreviewCharts.tsx SCurveChart`, CEO n).
 */
export function PanelSCurveChart({ sCurve, revisionNumber }: PanelSCurveChartProps) {
  const geo = sCurveGeometry(sCurve, (day) => formatDateDots(day).slice(0, 5));
  const { ref, scale } = useChartViewScale(S_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);

  if (geo.points.length === 0) {
    return <p className="ev-panel-chart__empty">S-eğrisi için veri yok.</p>;
  }

  const shownIndex = hover ?? (geo.today ? geo.today.index : null);
  const shownPoint = shownIndex !== null ? geo.points[shownIndex] : undefined;
  const shownRaw = shownIndex !== null ? sCurve[shownIndex] : undefined;

  return (
    <div className="ev-panel-chart-head">
      <div className="ev-panel-chart-head__row">
        <span className="ev-panel-chart-head__title">S-eğrisi · kümülatif ilerleme</span>
        <span className="ev-panel-chart-head__note">Tüm şantiye · doğrudan kalemler</span>
        <span className="ev-panel-chart-legend">
          <span className="ev-panel-chart-legend__item">
            <svg width="18" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="18" y2="2" className="ev-panel-chart__planned" />
            </svg>
            Planlı{revisionNumber !== null ? ` (Rev ${revisionNumber})` : ""}
          </span>
          <span className="ev-panel-chart-legend__item">
            <svg width="18" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="18" y2="2" className="ev-panel-chart__actual" />
            </svg>
            Gerçek
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--behind" />
            Gecikme
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--ahead" />
            Önde
          </span>
        </span>
      </div>

      <div className="ev-panel-chart">
        <svg
          ref={ref}
          viewBox={`0 0 ${S_VIEW_W} ${S_VIEW_H}`}
          className="ev-panel-chart__svg"
          role="img"
          aria-label="S-eğrisi, kümülatif ilerleme"
          onMouseMove={(event) => setHover(indexAt(toChartViewX(event, S_VIEW_W), geo.points.length, S_LEFT, S_RIGHT))}
          onMouseLeave={() => setHover(null)}
        >
          {geo.yTicks.map((tick) => (
            <g key={tick.label}>
              <line x1={S_LEFT} x2={S_RIGHT} y1={tick.y} y2={tick.y} className="ev-panel-chart__grid" />
              <text x={38} y={tick.y + 4} textAnchor="end" className="ev-panel-chart__tick ev-panel-chart__tick--mono">
                {tick.label}
              </text>
            </g>
          ))}
          <line x1={S_LEFT} x2={S_RIGHT} y1={S_BASE} y2={S_BASE} className="ev-panel-chart__axis" />
          {geo.xTicks.map((tick) => (
            <text key={tick.x} x={tick.x} y={242} textAnchor="middle" className="ev-panel-chart__tick">
              {tick.label}
            </text>
          ))}
          <path d={geo.fillBehind} className="ev-panel-chart__fill-behind" />
          <path d={geo.fillAhead} className="ev-panel-chart__fill-ahead" />
          <path d={geo.plannedPath} className="ev-panel-chart__planned" />
          <path d={geo.actualPath} className="ev-panel-chart__actual" />
          {geo.today && (
            <>
              <line x1={geo.today.x} x2={geo.today.x} y1={S_TOP} y2={S_BASE} className="ev-panel-chart__today" />
              <text x={geo.today.x} y={10} textAnchor="middle" className="ev-panel-chart__today-label">
                Bugün
              </text>
              <circle cx={geo.today.x} cy={geo.today.plannedY} r={3.5} className="ev-panel-chart__dot" />
              {geo.today.actualY !== null && (
                <circle cx={geo.today.x} cy={geo.today.actualY} r={4} className="ev-panel-chart__dot ev-panel-chart__dot--actual" />
              )}
            </>
          )}
        </svg>
        {shownPoint && shownRaw && (
          <ChartTooltip
            x={Math.round(shownPoint.x * scale)}
            y={Math.round((shownPoint.actualY ?? shownPoint.plannedY) * scale)}
            title={`${formatDateLong(shownRaw.day)} · Gün ${shownPoint.index + 1}`}
            rows={[
              { label: "Planlı", value: shownRaw.planned_pct_cum === null ? "" : formatPercent01(shownRaw.planned_pct_cum) },
              { label: "Gerçek", value: shownRaw.progress_pct_cum === null ? "" : formatPercent01(shownRaw.progress_pct_cum) },
              {
                label: "Sapma",
                value: shownRaw.variance === null ? "" : formatVariancePoints(shownRaw.variance),
                tone: shownRaw.status === "late" ? "negative" : shownRaw.status === "ahead" ? "positive" : "default",
                strong: true,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
