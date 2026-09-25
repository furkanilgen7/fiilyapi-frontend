"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { formatUnitRate } from "@/lib/earned-value";

import {
  PLOT_AXIS_Y,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  maxRateIndex,
  ratePlotGeometry,
} from "./rate-plot-geometry";

/** KAT:202-208 — dikey çizgilerin uçları ve metin satırları (viewBox birimi). */
const STD_LINE = { y1: 30, y2: 86, labelY: 98 } as const;
const AVG_LINE = { y1: 48, y2: 76 } as const;
const BAND = { y: 50, height: 24, rx: 3 } as const;
const TICK_LABEL_Y = 108;
const POINT_RADIUS = 5;
/** KAT:209 — "Veri yok" ipucunun dikey yeri (kutunun üstü, y=4). */
const EMPTY_TIP_Y = 20;

export interface RatePlotSite {
  name: string;
  rate: number;
}

interface RatePlotProps {
  uom: string;
  standard: number;
  sites: readonly RatePlotSite[];
  average: number | null;
  min: number | null;
  max: number | null;
}

/**
 * KAT:201-214 — min–max nokta grafiği (elle SVG, kütüphane yok).
 * İpucu ortak kitin `ChartTooltip`'i: varsayılan en yüksek nokta (KAT:460),
 * fare/odak başka noktaya geçince o nokta.
 */
export function RatePlot({ uom, standard, sites, average, min, max }: RatePlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const rates = sites.map((site) => site.rate);
  const defaultIndex = maxRateIndex(rates);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? defaultIndex;

  // viewBox → CSS pikseli: SVG `width:100%; height:auto` olduğu için tek ölçek.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const geometry = ratePlotGeometry({ standard, rates, average, min, max });
  const scale = width / PLOT_WIDTH;
  const activePoint = active === null ? null : geometry.points[active];
  const activeSite = active === null ? null : sites[active];

  return (
    <div className="ev-cat-plot" ref={wrapRef}>
      <svg
        className="ev-cat-plot__svg"
        viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
        role="img"
        aria-label={`Dağılım: standart ${formatUnitRate(standard)}, ortalama ${formatUnitRate(average)}`}
      >
        <line className="ev-cat-plot__axis" x1={14} x2={326} y1={PLOT_AXIS_Y} y2={PLOT_AXIS_Y} />
        {geometry.band && (
          <rect
            className="ev-cat-plot__band"
            x={geometry.band.x}
            y={BAND.y}
            width={geometry.band.width}
            height={BAND.height}
            rx={BAND.rx}
          />
        )}
        <line
          className="ev-cat-plot__std"
          x1={geometry.standardX}
          x2={geometry.standardX}
          y1={STD_LINE.y1}
          y2={STD_LINE.y2}
        />
        <text className="ev-cat-plot__std-label" x={geometry.standardX} y={STD_LINE.labelY} textAnchor="middle">
          {`std ${formatUnitRate(standard)}`}
        </text>
        {geometry.averageX !== null && (
          <line
            className="ev-cat-plot__avg"
            x1={geometry.averageX}
            x2={geometry.averageX}
            y1={AVG_LINE.y1}
            y2={AVG_LINE.y2}
          />
        )}
        {geometry.points.map((point) => (
          <circle
            key={point.index}
            className="ev-cat-plot__point"
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            tabIndex={0}
            aria-label={`${sites[point.index].name}: ${formatUnitRate(sites[point.index].rate)} a-s/${uom}`}
            onMouseEnter={() => setHovered(point.index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(point.index)}
            onBlur={() => setHovered(null)}
          />
        ))}
        {geometry.ticks.map((tick) => (
          <text key={tick.x} className="ev-cat-plot__tick" x={tick.x} y={TICK_LABEL_Y} textAnchor="middle">
            {formatUnitRate(tick.value)}
          </text>
        ))}
      </svg>
      {activePoint && activeSite ? (
        <ChartTooltip
          x={Math.round(activePoint.x * scale)}
          y={Math.round((activePoint.y - POINT_RADIUS) * scale)}
          placement="top"
          title={activeSite.name}
          rows={[
            {
              label: active === defaultIndex ? "En yüksek" : "Oran",
              value: `${formatUnitRate(activeSite.rate)} a-s/${uom}`,
            },
          ]}
        />
      ) : (
        <ChartTooltip
          x={Math.round((PLOT_WIDTH / 2) * scale)}
          y={Math.round(EMPTY_TIP_Y * scale)}
          placement="bottom"
          title="Veri yok"
          rows={[]}
        />
      )}
    </div>
  );
}
