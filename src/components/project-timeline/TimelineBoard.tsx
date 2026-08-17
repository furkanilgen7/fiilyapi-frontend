"use client";

import { forwardRef } from "react";
import Link from "next/link";

import { ChevronDownIcon } from "@/components/ui/icons";
import { formatCompactCurrencyTight, formatPeriodShort } from "@/lib/format";

import { sectionStatusLabel } from "./palette";
import type { TimelineRowModel } from "./rows";
import {
  barGeometry,
  pointPct,
  timelineColumns,
  type TimelineWindow,
  type TimelineZoom,
} from "./timeline-scale";

/** Aylık kipte bir ay sütununun taban genişliği (mockup: 1400px / 24 ay ≈ 58px). */
const MONTH_COLUMN_PX = 58;

export interface TimelineBoardProps {
  rows: readonly TimelineRowModel[];
  window: TimelineWindow;
  zoom: TimelineZoom;
  /** SUNUCU damgası (`ProjectTimelineResponse.today`) — istemci saati DEĞİL. */
  today: string;
  onToggleProject: (projectId: string) => void;
}

function shortRange(start: string | null, end: string | null): string | null {
  const parts: string[] = [];
  for (const iso of [start, end]) {
    if (!iso) continue;
    const [year, month] = iso.split("-").map(Number);
    if (year === undefined || month === undefined) continue;
    parts.push(formatPeriodShort(year, month));
  }
  if (parts.length === 0) return null;
  return parts.join(" – ");
}

/**
 * Gantt tahtası: solda katlanır proje/faz sütunu (mockup 61-115), sağda ay
 * ızgarası + barlar (118-292). İki taraf AYNI `rows` dizisini gezer.
 *
 * Yatay kaydırma `ref` ile dışarı verilir — araç çubuğundaki `‹ › Bugün`
 * düğmeleri ızgarayı kaydırır; pencerenin KENDİSİ (K8) veriden türediği için
 * asla daraltılmaz, yani hiçbir proje bir gezinme yüzünden kırpılmaz.
 */
export const TimelineBoard = forwardRef<HTMLDivElement, TimelineBoardProps>(function TimelineBoard(
  { rows, window: win, zoom, today, onToggleProject },
  scrollRef,
) {
  const columns = timelineColumns(win, zoom);
  const todayColumnKey = todayColumn(win, today, zoom);
  const todayLinePct = pointPct(win, today);
  const gridMinWidth = zoom === "monthly" ? `${win.monthCount * MONTH_COLUMN_PX}px` : "100%";

  return (
    <div className="tkv__main">
      <div className="tkv__left" data-testid="tkv-left">
        <div className="tkv__left-head">Proje / Faz</div>
        {rows.map((row) =>
          row.kind === "project" ? (
            <button
              key={row.key}
              type="button"
              className="tkv__proj-row tkv-palette"
              data-palette={row.palette}
              aria-expanded={!row.isCollapsed}
              onClick={() => onToggleProject(row.project.id)}
            >
              <ChevronDownIcon
                width={12}
                height={12}
                aria-hidden="true"
                className={`tkv__chevron${row.isCollapsed ? " tkv__chevron--collapsed" : ""}`}
              />
              <span className="tkv__proj-dot" aria-hidden="true" />
              <span>
                <span className="tkv__proj-name">{row.project.name}</span>
                <span className="tkv__proj-meta">
                  {[
                    row.project.contract_amount
                      ? formatCompactCurrencyTight(row.project.contract_amount)
                      : null,
                    shortRange(row.project.start_date, row.project.end_date),
                    row.sectionCount === 0 ? "bölüm yok" : null,
                  ]
                    .filter((part): part is string => part !== null)
                    .join(" · ")}
                </span>
              </span>
            </button>
          ) : (
            <div
              key={row.key}
              className={`tkv__sec-row tkv-palette${
                row.section.status === "active" ? " tkv__sec-row--active" : ""
              }`}
              data-palette={row.palette}
            >
              <span className="tkv__sec-name">{row.section.name}</span>
            </div>
          ),
        )}
      </div>

      <div className="tkv__grid-scroll" ref={scrollRef} data-testid="tkv-grid-scroll">
        <div className="tkv__grid" style={{ minWidth: gridMinWidth }}>
          <div className="tkv__grid-head">
            {zoom === "monthly" ? (
              <div className="tkv__band tkv__band--years">
                {yearBands(win).map((band) => (
                  <div
                    key={band.year}
                    className="tkv__band-cell"
                    style={{ width: `${band.widthPct}%` }}
                  >
                    {band.year}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="tkv__band" data-testid="tkv-columns">
              {columns.map((column) => (
                <div
                  key={column.key}
                  data-testid="tkv-column"
                  className={[
                    "tkv__band-cell",
                    column.isYearEnd ? "tkv__band-cell--year-end" : "",
                    column.key === todayColumnKey ? "tkv__band-cell--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ width: `${column.widthPct}%` }}
                >
                  {column.label}
                </div>
              ))}
            </div>
          </div>

          <div className="tkv__rows" data-testid="tkv-rows">
            {rows.map((row) => {
              const isProject = row.kind === "project";
              const source = isProject ? row.project : row.section;
              const bar = barGeometry(win, source.start_date, source.end_date);
              const status = isProject ? null : row.section.status;
              return (
                <div
                  key={row.key}
                  className={[
                    "tkv__row",
                    "tkv-palette",
                    isProject ? "tkv__row--project" : "tkv__row--section",
                    !isProject && row.section.status === "active" ? "tkv__row--section-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-palette={row.palette}
                >
                  <div className="tkv__track">
                    {bar === null ? (
                      <span className="tkv__no-bar" data-testid="tkv-no-bar">
                        Tarih girilmedi — bar çizilemiyor
                      </span>
                    ) : (
                      <Link
                        href={`/projeler/${row.project.id}`}
                        data-testid={isProject ? "tkv-project-bar" : "tkv-section-bar"}
                        data-status={status ?? undefined}
                        data-clipped={bar.clippedStart || bar.clippedEnd ? "true" : undefined}
                        className={[
                          "tkv__bar",
                          isProject ? "tkv__bar--project" : `tkv__bar--${row.section.status}`,
                        ].join(" ")}
                        style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
                        title={
                          isProject
                            ? row.project.name
                            : `${row.section.name} · ${sectionStatusLabel(row.section.status)}`
                        }
                      >
                        {isProject
                          ? [
                              row.project.name,
                              row.project.contract_amount
                                ? formatCompactCurrencyTight(row.project.contract_amount)
                                : null,
                            ]
                              .filter((part): part is string => part !== null)
                              .join(" · ")
                          : row.section.name}
                      </Link>
                    )}

                    {!isProject &&
                      row.section.milestones.map((milestone) => {
                        const left = pointPct(win, milestone.milestone_date);
                        if (left === null) return null;
                        return (
                          <Link
                            key={milestone.id}
                            href={`/projeler/${row.project.id}`}
                            data-testid="tkv-milestone"
                            className="tkv__milestone"
                            style={{ left: `${left}%` }}
                            title={`${milestone.title} · ${milestone.milestone_date}`}
                            aria-label={`${milestone.title} kilometre taşı`}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}

            {todayLinePct === null ? null : (
              <div
                className="tkv__today-line"
                data-testid="tkv-today-line"
                style={{ left: `${todayLinePct}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/** Yıl bandı (mockup 121'deki 58px yıl sütununun çok yıllı penceredeki karşılığı). */
function yearBands(win: TimelineWindow): { year: number; widthPct: number }[] {
  const perYear = new Map<number, number>();
  for (let index = 0; index < win.monthCount; index += 1) {
    const absolute = win.startMonth - 1 + index;
    const year = win.startYear + Math.floor(absolute / 12);
    perYear.set(year, (perYear.get(year) ?? 0) + 1);
  }
  return [...perYear.entries()].map(([year, count]) => ({
    year,
    widthPct: (count / win.monthCount) * 100,
  }));
}

/** Bugünün düştüğü sütunun anahtarı (mockup 141: Temmuz hücresi kırmızı). */
function todayColumn(win: TimelineWindow, today: string, zoom: TimelineZoom): string | null {
  if (pointPct(win, today) === null) return null;
  const [year, month] = today.split("-");
  if (year === undefined || month === undefined) return null;
  return zoom === "monthly" ? `${year}-${month}` : year;
}
