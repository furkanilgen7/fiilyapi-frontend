"use client";

import { useRef, useState } from "react";

import { ChartTooltip } from "@/components/earned-value/common/chart-tooltip/ChartTooltip";
import { cx } from "@/lib/cx";

import { GANTT_VIEW_WIDTH, type GanttGeometry, type GanttRect, type GanttRow } from "./gantt-geometry";

interface GanttChartProps {
  geometry: GanttGeometry;
  /** Taslak + draft: çubuğa tıklanıp pencere ezilir (M3). */
  editable: boolean;
  onPick: (row: GanttRow) => void;
  /** Açık popover (çubuğun altına konumlanır). */
  popover: { row: GanttRow; node: React.ReactNode } | null;
}

interface Hover {
  row: GanttRow;
  x: number;
  y: number;
}

/** Çubuk metni: ezilmişse turuncu nokta öncüsü (M3), taşmışsa uyarı rengi. */
function BarRow({ row, editable, onPick, onHover }: { row: GanttRow; editable: boolean; onPick: () => void; onHover: (e: React.MouseEvent<SVGElement> | null) => void }) {
  const clickable = editable && row.kind === "bar" && row.sectionId !== null;
  const label = `${row.label} penceresi ${row.dates}`;
  return (
    <g className={cx("ev-gantt__row", `ev-gantt__row--${row.kind}`)}>
      <line x1={0} x2={GANTT_VIEW_WIDTH} y1={row.lineY} y2={row.lineY} className="ev-gantt__rule" />
      <text x={row.labelX} y={row.textY} className="ev-gantt__label">
        {row.label}
      </text>
      {row.ghost && (
        <rect x={row.ghost.x} y={row.ghost.y} width={row.ghost.w} height={row.ghost.h} rx={3} className="ev-gantt__ghost" />
      )}
      {row.bar && (
        <rect
          x={row.bar.x}
          y={row.bar.y}
          width={row.bar.w}
          height={row.bar.h}
          rx={3}
          className={cx(row.kind === "section" ? "ev-gantt__section-bar" : "ev-gantt__bar", clickable && "ev-gantt__bar--clickable")}
          style={row.color ? { fill: row.color } : undefined}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
          aria-label={clickable ? `${label} — düzenle` : undefined}
          onClick={clickable ? onPick : undefined}
          onKeyDown={(event) => {
            if (clickable && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onPick();
            }
          }}
          onMouseEnter={row.kind === "bar" ? (event) => onHover(event) : undefined}
          onMouseLeave={row.kind === "bar" ? () => onHover(null) : undefined}
        />
      )}
      {row.override && <circle cx={row.datesX + 3} cy={row.textY - 4} r={3.5} className="ev-gantt__override-dot" />}
      <text x={row.datesX + (row.override ? 10 : 0)} y={row.textY} className={cx("ev-gantt__dates", row.outside && "ev-gantt__dates--outside")}>
        {row.dates}
      </text>
    </g>
  );
}

/**
 * Adım 2 Gantt — Adam-Saat Bütçesi.dc.html:294-307 (+ Ek Formlar M3 gölge,
 * turuncu nokta, M4 "Bölümsüz" grubu). Salt okunurda çubuk tıklanmaz, üstüne
 * gelince ipucu gösterir (M3 b).
 */
export function GanttChart({ geometry, editable, onPick, popover }: GanttChartProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const bottom = geometry.height - 6;

  function hoverFor(row: GanttRow) {
    return (event: React.MouseEvent<SVGElement> | null) => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!event || !box || editable) return setHover(null);
      const r = event.currentTarget.getBoundingClientRect();
      setHover({ row, x: Math.round(r.left - box.left + r.width / 2), y: Math.round(r.top - box.top) });
    };
  }

  return (
    <div ref={boxRef} className="ev-gantt">
      <svg viewBox={`0 0 ${GANTT_VIEW_WIDTH} ${geometry.height}`} className="ev-gantt__svg" role="img" aria-label="Disiplin × bölüm pencereleri">
        {geometry.holidays.map((h) => (
          <rect key={h.x} x={h.x} y={22} width={h.w} height={Math.max(0, bottom - 22)} className="ev-gantt__holiday" />
        ))}
        {geometry.months.map((m) => (
          <g key={m.x}>
            <line x1={m.x} x2={m.x} y1={18} y2={bottom} className="ev-gantt__month-line" />
            <text x={m.x + 4} y={14} className="ev-gantt__month">
              {m.label}
            </text>
          </g>
        ))}
        {geometry.rows.map((row) => (
          <BarRow key={row.key} row={row} editable={editable} onPick={() => onPick(row)} onHover={hoverFor(row)} />
        ))}
        {geometry.todayX !== null && <line x1={geometry.todayX} x2={geometry.todayX} y1={18} y2={bottom} className="ev-gantt__today" />}
      </svg>
      {popover?.row.bar && <PopoverAnchor bar={popover.row.bar} height={geometry.height}>{popover.node}</PopoverAnchor>}
      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          title={hover.row.label}
          rows={[{ label: hover.row.override ? "Pencere · ezildi" : "Pencere", value: hover.row.dates }]}
          placement="top"
        />
      )}
    </div>
  );
}

/** Açık pencere popover'ı çubuğun altına, viewBox oranıyla konumlanır. */
function PopoverAnchor({ bar, height, children }: { bar: GanttRect; height: number; children: React.ReactNode }) {
  return (
    <div
      className="ev-gantt__popover-anchor"
      style={{
        left: `${((bar.x + bar.w / 2) / GANTT_VIEW_WIDTH) * 100}%`,
        top: `${((bar.y + bar.h) / height) * 100}%`,
      }}
    >
      {children}
    </div>
  );
}
