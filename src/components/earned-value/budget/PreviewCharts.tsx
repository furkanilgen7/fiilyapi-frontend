"use client";

import { useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { EMPTY_CELL, formatDateDots } from "@/lib/format";
import type { EvPreviewOut } from "@/lib/api/models";

import { formatMhr, localTodayIso } from "./budget-format";
import {
  H_BASE,
  H_LEFT,
  H_RIGHT,
  H_VIEW_H,
  H_VIEW_W,
  S_BASE,
  S_LEFT,
  S_RIGHT,
  S_TOP,
  S_VIEW_H,
  S_VIEW_W,
  histogramGeometry,
  sCurveGeometry,
  sCurveIndexAt,
  sCurvePoint,
} from "./preview-geometry";

/** BÜT:343-344 — %100/%75/%50/%25/%0 kılavuzları. */
const S_GRID = [100, 75, 50, 25, 0];
const PCT = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function yPct(pct: number): number {
  return Math.round(S_BASE - (pct / 100) * (S_BASE - S_TOP));
}

function toViewX(event: React.MouseEvent<SVGSVGElement>, viewWidth: number): { viewX: number; scale: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const scale = rect.width > 0 ? rect.width / viewWidth : 1;
  return { viewX: (event.clientX - rect.left) / scale, scale };
}

/** Planlı S-eğrisi · disiplin bazında — Adam-Saat Bütçesi.dc.html:334-357. */
export function SCurveChart({ preview, revisionNumber }: { preview: EvPreviewOut; revisionNumber: number | null }) {
  const geo = sCurveGeometry(preview);
  const [hover, setHover] = useState<{ index: number; scale: number } | null>(null);
  const todayIndex = geo.days.indexOf(localTodayIso());
  const point = hover ? sCurvePoint(geo, hover.index) : null;
  const today = todayIndex >= 0 ? sCurvePoint(geo, todayIndex) : null;
  if (geo.days.length === 0) return <p className="ev-budget-chart__empty">Eğri için bütçeli ve pencereli yaprak yok.</p>;
  return (
    <div className="ev-budget-chart">
      <svg
        viewBox={`0 0 ${S_VIEW_W} ${S_VIEW_H}`}
        className="ev-budget-chart__svg"
        role="img"
        aria-label="Planlı S-eğrisi"
        onMouseMove={(event) => {
          const { viewX, scale } = toViewX(event, S_VIEW_W);
          setHover({ index: sCurveIndexAt(geo, viewX), scale });
        }}
        onMouseLeave={() => setHover(null)}
      >
        <SCurveGrid />
        {geo.areas.map((a) => (
          <path key={a.key} d={a.d} className="ev-chart__area" style={{ fill: a.color || undefined }} />
        ))}
        <path d={geo.totalLine} className="ev-chart__total" />
        <XTicks ticks={geo.ticks} y={242} />
        {today && <line x1={today.x} x2={today.x} y1={S_TOP} y2={S_BASE} className="ev-chart__today" />}
        {(point ?? today) && <circle cx={(point ?? today)!.x} cy={(point ?? today)!.y} r={4} className="ev-chart__dot" />}
      </svg>
      {point && hover && (
        <ChartTooltip
          x={Math.round(point.x * hover.scale)}
          y={Math.round(point.y * hover.scale)}
          title={`${formatDateDots(point.day)} · Gün ${point.index + 1}`}
          rows={[
            { label: `Planlı${revisionNumber !== null ? ` (Rev ${revisionNumber})` : ""}`, value: `%${PCT.format(point.pct)}` },
            { label: "Planlı a-s", value: `${formatMhr(point.mhr)} a-s` },
          ]}
        />
      )}
    </div>
  );
}

/** Gereken işçi · haftalık — Adam-Saat Bütçesi.dc.html:359-383 (K10). */
export function WorkerHistogram({ preview }: { preview: EvPreviewOut }) {
  const geo = histogramGeometry(preview);
  const [hover, setHover] = useState<{ index: number; scale: number } | null>(null);
  const weeks = preview.total.weeks;
  if (weeks.length === 0) return <p className="ev-budget-chart__empty">Haftalık dağılım yok.</p>;
  const index = hover?.index ?? null;
  const week = index !== null ? weeks[index] : null;
  const bar = index !== null ? geo.bars[index] : null;
  return (
    <div className="ev-budget-chart">
      <svg
        viewBox={`0 0 ${H_VIEW_W} ${H_VIEW_H}`}
        className="ev-budget-chart__svg"
        role="img"
        aria-label="Haftalık gereken işçi"
        onMouseMove={(event) => {
          const { viewX, scale } = toViewX(event, H_VIEW_W);
          const slot = (H_RIGHT - H_LEFT) / weeks.length;
          const i = Math.min(weeks.length - 1, Math.max(0, Math.floor((viewX - H_LEFT) / slot)));
          setHover({ index: i, scale });
        }}
        onMouseLeave={() => setHover(null)}
      >
        <HistogramGrid ticks={geo.yTicks} />
        {geo.bars.map((b) => (
          <rect key={b.week} x={b.x} y={b.y} width={b.w} height={b.h} className="ev-chart__bar" />
        ))}
        {geo.line && <path d={geo.line} className="ev-chart__crew" />}
        <line x1={H_LEFT} x2={H_RIGHT} y1={H_BASE} y2={H_BASE} className="ev-chart__axis" />
        <XTicks ticks={geo.ticks} y={232} mono />
      </svg>
      {week && bar && hover && (
        <ChartTooltip
          x={Math.round((bar.x + bar.w / 2) * hover.scale)}
          y={Math.round(bar.y * hover.scale)}
          title={`H${week.week_no}${index === geo.peakIndex ? " · tepe hafta" : ""}`}
          rows={[
            { label: "Gereken", value: `${formatMhr(week.required_people)} kişi` },
            { label: "Bölüm planı", value: week.planned_people === null ? EMPTY_CELL : `${week.planned_people} kişi`, tone: "negative" },
          ]}
        />
      )}
    </div>
  );
}

function SCurveGrid() {
  return (
    <>
      {S_GRID.map((pct) => (
        <g key={pct}>
          <line x1={S_LEFT} x2={S_RIGHT} y1={yPct(pct)} y2={yPct(pct)} className={pct === 0 ? "ev-chart__axis" : "ev-chart__grid"} />
          <text x={38} y={yPct(pct) + 4} textAnchor="end" className="ev-chart__tick ev-chart__tick--mono">
            %{pct}
          </text>
        </g>
      ))}
    </>
  );
}

function HistogramGrid({ ticks }: { ticks: readonly { y: number; value: number }[] }) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t.value}>
          <line x1={H_LEFT} x2={H_RIGHT} y1={t.y} y2={t.y} className="ev-chart__grid" />
          <text x={28} y={t.y + 4} textAnchor="end" className="ev-chart__tick ev-chart__tick--mono">
            {formatMhr(t.value)}
          </text>
        </g>
      ))}
    </>
  );
}

function XTicks({ ticks, y, mono = false }: { ticks: readonly { x: number; label: string }[]; y: number; mono?: boolean }) {
  return (
    <>
      {ticks.map((t) => (
        <text key={t.x} x={t.x} y={y} textAnchor="middle" className={mono ? "ev-chart__tick ev-chart__tick--mono" : "ev-chart__tick"}>
          {t.label}
        </text>
      ))}
    </>
  );
}
