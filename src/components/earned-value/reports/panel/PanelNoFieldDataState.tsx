"use client";

import { sCurveGeometry, S_BASE, S_TOP, S_VIEW_H, S_VIEW_W } from "../charts/s-curve-geometry";
import { formatDayMonth } from "@/lib/format";
import type { EvPanelReport } from "@/lib/api/models";

import "./panel-empty-states.css";
import "./panel-charts.css";

export interface PanelNoFieldDataStateProps {
  sCurve: EvPanelReport["s_curve"];
}

const Y_GRID = [0, 25, 50, 75, 100];

/**
 * PLN-F3.3 · (b) Baseline var, sahadan veri yok — Panel:410-423.
 * `has_baseline === true` VE `has_field_data === false` iken basılır.
 *
 * İki mini KPI ("GERÇEK %"/"KÜM. PF") HER ZAMAN "–" (sahadan veri yoksa
 * gerçek/PF hesaplanamaz — istemci UYDURMAZ). SVG'de YALNIZ planlı eğri
 * (kesikli) + "Bugün" dikey çizgisi; `s_curve[].planned_pct_cum`dan F3.2b
 * geometrisiyle çizilir (mockup'ın SABİT `M8 80 C60 78…` path'i KOPYALANMAZ
 * — o path sahte veriye özgüdür, gerçek API'nin planlı serisi her şantiyede
 * FARKLIDIR).
 */
export function PanelNoFieldDataState({ sCurve }: PanelNoFieldDataStateProps) {
  const geo = sCurveGeometry(sCurve, (day) => formatDayMonth(day));

  return (
    <div className="ev-panel-no-field-data">
      <div className="ev-panel-no-field-data__mini-kpis">
        <div className="ev-panel-no-field-data__mini-kpi">
          <div className="ev-panel-no-field-data__mini-label">GERÇEK %</div>
          <div className="ev-panel-no-field-data__mini-value">–</div>
        </div>
        <div className="ev-panel-no-field-data__mini-kpi">
          <div className="ev-panel-no-field-data__mini-label">KÜM. PF</div>
          <div className="ev-panel-no-field-data__mini-value">–</div>
        </div>
      </div>

      {geo.points.length === 0 ? (
        <p className="ev-panel-chart__empty">Eğri için veri yok.</p>
      ) : (
        <div className="ev-panel-chart">
          <svg viewBox={`0 0 ${S_VIEW_W} ${S_VIEW_H}`} className="ev-panel-chart__svg" role="img" aria-label="Yalnız planlı S-eğrisi">
            {Y_GRID.map((pct) => {
              const tick = geo.yTicks.find((t) => t.label === `%${pct}`);
              const y = tick?.y ?? S_BASE - (pct / 100) * (S_BASE - S_TOP);
              return <line key={pct} x1={44} x2={744} y1={y} y2={y} className={pct === 0 ? "ev-panel-chart__axis" : "ev-panel-chart__grid"} />;
            })}
            <path d={geo.plannedPath} className="ev-panel-chart__planned" />
            {geo.today && (
              <>
                <line
                  x1={geo.today.x}
                  x2={geo.today.x}
                  y1={S_TOP}
                  y2={S_BASE}
                  className="ev-panel-chart__today"
                />
                <text x={geo.today.x} y={S_TOP - 4} textAnchor="middle" className="ev-panel-chart__today-label">
                  Bugün · yalnız planlı eğri
                </text>
              </>
            )}
          </svg>
        </div>
      )}

      <p className="ev-panel-no-field-data__caption">İlk günlük gönderildiğinde gerçek eğri ve PF hesaplanır.</p>
    </div>
  );
}
