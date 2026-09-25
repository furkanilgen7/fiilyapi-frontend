"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { formatDateDots } from "@/lib/format";
import { bandsFromReport, formatPf, DEFAULT_PF_BANDS } from "@/lib/earned-value";
import type { EvPanelReport } from "@/lib/api/models";

import { indexAt } from "../charts/scale";
import { PF_BASE, PF_LEFT, PF_RIGHT, PF_TOP, PF_VIEW_H, PF_VIEW_W, pfTrendGeometry } from "../charts/pf-trend-geometry";
import { useChartViewScale, toChartViewX } from "../charts/use-chart-view-scale";
import "./panel-charts.css";

export interface PanelPfTrendChartProps {
  pfTrend: EvPanelReport["pf_trend"];
  pfBands: EvPanelReport["pf_bands"];
  rangeLabel: string;
  /** `report.data.day` (ISO) — "Bugün"ün ÇAPASI, `pf_trend`teki GELECEK günleri elemek için. */
  reportDay: string;
}

const dayShort = (day: string) => formatDateDots(day).slice(0, 5);

/**
 * PLN-F3.3 · PF trendi — Panel:290-319 (S14). Zemin GÜNLÜK bant
 * (`pf_bands.daily`), noktalar `pf_day`, 7 günlük ort. çizgi `pf_rolling`
 * (backend'den, İSTEMCİ TÜRETMEZ). Y 0,80–1,20 KIRPILIR.
 */
export function PanelPfTrendChart({ pfTrend, pfBands, rangeLabel, reportDay }: PanelPfTrendChartProps) {
  const thresholds = bandsFromReport(pfBands)?.daily ?? DEFAULT_PF_BANDS.daily;
  const geo = pfTrendGeometry(pfTrend, thresholds, dayShort, reportDay);
  const { ref, scale } = useChartViewScale(PF_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);

  if (geo.points.length === 0) {
    return <p className="ev-panel-chart__empty">PF trendi için veri yok.</p>;
  }

  // 🔴 LİDER DENETİMİ KUSURU (P2) — varsayılan (fare üstünde DEĞİLKEN)
  // gösterilen nokta ÖNCEDEN dizinin SON elemanıydı (`geo.points.length -
  // 1`); dizi GELECEĞE uzanıyorsa bu bir gelecek günü "Bugün" diye
  // basıyordu. `geo.today.index` "Bugün"ün GERÇEK dizindeksidir (bkz.
  // `pfTrendGeometry` — son GELECEK-OLMAYAN nokta).
  const shownIndex = hover ?? geo.today?.index ?? geo.points.length - 1;
  const shownPoint = geo.points[shownIndex];
  const shownRaw = pfTrend[shownIndex];

  return (
    <div className="ev-panel-chart-head">
      <div className="ev-panel-chart-head__row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <span className="ev-panel-chart-head__title">PF trendi · {rangeLabel}</span>
        <span className="ev-panel-chart-legend">
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__dot ev-panel-chart-legend__dot--pf" />
            Günlük PF
          </span>
          <span className="ev-panel-chart-legend__item">
            <svg width="16" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="16" y2="2" className="ev-panel-chart__pf-rolling-line" />
            </svg>
            7 günlük ort.
          </span>
          <span className="ev-panel-chart-legend__item">
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--behind" />
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--amber" />
            <span className="ev-panel-chart-legend__swatch ev-panel-chart-legend__swatch--ahead" />
            PF bantları
          </span>
        </span>
      </div>
      <div className="ev-panel-chart">
        <svg
          ref={ref}
          viewBox={`0 0 ${PF_VIEW_W} ${PF_VIEW_H}`}
          className="ev-panel-chart__svg"
          role="img"
          aria-label="PF trendi"
          onMouseMove={(event) => setHover(indexAt(toChartViewX(event, PF_VIEW_W), geo.points.length, PF_LEFT, PF_RIGHT))}
          onMouseLeave={() => setHover(null)}
        >
          {geo.bandZones.map((zone) => (
            <rect
              key={zone.color}
              x={PF_LEFT}
              y={zone.y}
              width={PF_RIGHT - PF_LEFT}
              height={zone.height}
              className={`ev-panel-chart__pf-zone ev-panel-chart__pf-zone--${zone.color}`}
            />
          ))}
          {geo.yTicks.map((tick) => (
            <text key={tick.label} x={30} y={tick.y + 4} textAnchor="end" className="ev-panel-chart__tick ev-panel-chart__tick--mono">
              {tick.label}
            </text>
          ))}
          <line x1={PF_LEFT} x2={PF_RIGHT} y1={PF_BASE} y2={PF_BASE} className="ev-panel-chart__axis" />
          {geo.points.map((point) => point.y !== null && <circle key={point.day} cx={point.x} cy={point.y} r={2.5} className="ev-panel-chart__pf-dot" />)}
          <path d={geo.rollingPath} className="ev-panel-chart__pf-rolling-line-path" />
          {geo.today && (
            <line x1={geo.today.x} x2={geo.today.x} y1={PF_TOP} y2={PF_BASE} className="ev-panel-chart__today" />
          )}
          {geo.xTicks.map((tick) => (
            <text key={tick.x} x={tick.x} y={PF_VIEW_H - 10} textAnchor={tick.align} className="ev-panel-chart__tick">
              {tick.label}
            </text>
          ))}
        </svg>
        {shownPoint && shownRaw && (
          <ChartTooltip
            x={Math.round((shownPoint.x - 124) * scale)}
            y={Math.round((PF_TOP + 8) * scale)}
            title={`${dayShort(shownRaw.day)} · Bugün`}
            rows={[
              { label: "Günlük PF", value: shownRaw.pf_day === null ? "" : formatPf(shownRaw.pf_day) },
              { label: "7 gün ort.", value: shownRaw.pf_rolling === null ? "" : formatPf(shownRaw.pf_rolling) },
            ]}
          />
        )}
      </div>
    </div>
  );
}
