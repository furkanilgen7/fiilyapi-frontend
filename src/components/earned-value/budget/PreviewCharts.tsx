"use client";

import { useLayoutEffect, useRef, useState } from "react";

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
  defaultHistogramIndex,
  defaultSCurveIndex,
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

function scaleOf(svg: SVGSVGElement | null, viewWidth: number): number {
  const width = svg?.getBoundingClientRect().width ?? 0;
  return width > 0 ? width / viewWidth : 1;
}

function toViewX(event: React.MouseEvent<SVGSVGElement>, viewWidth: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return (event.clientX - rect.left) / scaleOf(event.currentTarget, viewWidth);
}

/**
 * viewBox → CSS pikseli ölçeği. Durağan ipucu (CEO n) fare olayı OLMADAN da
 * konumlanmalı → SVG genişliği açılışta ve pencere boyu değişince ölçülür.
 */
function useViewScale(viewWidth: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => setScale(scaleOf(ref.current, viewWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewWidth]);
  return { ref, scale };
}

interface SCurveChartProps {
  preview: EvPreviewOut;
  revisionNumber: number | null;
  /** Varsayılan yerel bugün; test edilebilirlik için dışarıdan verilebilir. */
  todayIso?: string;
}

/**
 * Planlı S-eğrisi · disiplin bazında — Adam-Saat Bütçesi.dc.html:334-357.
 * İpucu: fare üstündeyse o gün, değilse DURAĞAN bugün ipucu (BÜT:351-356, CEO n).
 */
export function SCurveChart({ preview, revisionNumber, todayIso = localTodayIso() }: SCurveChartProps) {
  const geo = sCurveGeometry(preview);
  const { ref, scale } = useViewScale(S_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);
  const todayIndex = defaultSCurveIndex(geo, todayIso);
  const shownIndex = hover ?? todayIndex;
  const point = shownIndex !== null ? sCurvePoint(geo, shownIndex) : null;
  const today = todayIndex !== null ? sCurvePoint(geo, todayIndex) : null;
  if (geo.days.length === 0) return <p className="ev-budget-chart__empty">Eğri için bütçeli ve pencereli yaprak yok.</p>;
  return (
    <div className="ev-budget-chart">
      <svg
        ref={ref}
        viewBox={`0 0 ${S_VIEW_W} ${S_VIEW_H}`}
        className="ev-budget-chart__svg"
        role="img"
        aria-label="Planlı S-eğrisi"
        onMouseMove={(event) => setHover(sCurveIndexAt(geo, toViewX(event, S_VIEW_W)))}
        onMouseLeave={() => setHover(null)}
      >
        <SCurveGrid />
        {geo.areas.map((a) => (
          <path key={a.key} d={a.d} className="ev-chart__area" style={{ fill: a.color || undefined }} />
        ))}
        <path d={geo.totalLine} className="ev-chart__total" />
        <XTicks ticks={geo.ticks} y={242} />
        {today && <line x1={today.x} x2={today.x} y1={S_TOP} y2={S_BASE} className="ev-chart__today" />}
        {point && <circle cx={point.x} cy={point.y} r={4} className="ev-chart__dot" />}
      </svg>
      {point && (
        <ChartTooltip
          x={Math.round(point.x * scale)}
          y={Math.round(point.y * scale)}
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

/**
 * Gereken işçi · haftalık — Adam-Saat Bütçesi.dc.html:359-383 (K10).
 * İpucu: fare üstündeyse o hafta, değilse DURAĞAN tepe hafta ipucu (BÜT:376-381, CEO n).
 */
export function WorkerHistogram({ preview }: { preview: EvPreviewOut }) {
  const geo = histogramGeometry(preview);
  const { ref, scale } = useViewScale(H_VIEW_W);
  const [hover, setHover] = useState<number | null>(null);
  const weeks = preview.total.weeks;
  if (weeks.length === 0) return <p className="ev-budget-chart__empty">Haftalık dağılım yok.</p>;
  const index = hover ?? defaultHistogramIndex(geo);
  return (
    <div className="ev-budget-chart">
      <svg
        ref={ref}
        viewBox={`0 0 ${H_VIEW_W} ${H_VIEW_H}`}
        className="ev-budget-chart__svg"
        role="img"
        aria-label="Haftalık gereken işçi"
        onMouseMove={(event) => {
          const slot = (H_RIGHT - H_LEFT) / weeks.length;
          const i = Math.floor((toViewX(event, H_VIEW_W) - H_LEFT) / slot);
          setHover(Math.min(weeks.length - 1, Math.max(0, i)));
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
      {index !== null && <WeekTooltip preview={preview} geo={geo} index={index} scale={scale} />}
    </div>
  );
}

interface WeekTooltipProps {
  preview: EvPreviewOut;
  geo: ReturnType<typeof histogramGeometry>;
  index: number;
  scale: number;
}

/** BÜT:376-381 — "H{n} · tepe hafta" / Gereken / Bölüm planı. */
function WeekTooltip({ preview, geo, index, scale }: WeekTooltipProps) {
  const week = preview.total.weeks[index];
  const bar = geo.bars[index];
  if (!week || !bar) return null;
  return (
    <ChartTooltip
      x={Math.round((bar.x + bar.w / 2) * scale)}
      y={Math.round(bar.y * scale)}
      title={`H${week.week_no}${index === geo.peakIndex ? " · tepe hafta" : ""}`}
      rows={[
        { label: "Gereken", value: `${formatMhr(week.required_people)} kişi` },
        { label: "Bölüm planı", value: week.planned_people === null ? EMPTY_CELL : `${week.planned_people} kişi`, tone: "negative" },
      ]}
    />
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
