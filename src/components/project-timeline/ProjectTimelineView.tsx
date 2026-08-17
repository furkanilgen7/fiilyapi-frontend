"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProjectTimeline } from "@/lib/api/hooks/useProjectTimeline";
import { isForbidden } from "@/lib/api/unwrap";
import { formatCompactCurrency, formatDateLong, formatPeriodShort } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { STATUS_LEGEND } from "./palette";
import { buildRows, windowRanges } from "./rows";
import { portfolioSummary } from "./summary";
import { TimelineBoard } from "./TimelineBoard";
import { timelineWindow, timelineWindowLabel, type TimelineZoom } from "./timeline-scale";
import "./project-timeline.css";

/** Görünüm anahtarı (mockup 30-34). Gerekçe ÖĞENİN KENDİSİNDEN türer. */
interface ZoomOption {
  value: TimelineZoom | "weekly";
  label: string;
  /** Doluysa düğme devre dışıdır ve bu metin EKRANA basılır (title'a saklanmaz). */
  disabledReason?: string;
}

const ZOOM_OPTIONS: readonly ZoomOption[] = [
  { value: "monthly", label: "Aylık" },
  { value: "weekly", label: "Haftalık", disabledReason: pendingModuleLabel("timeline_weekly_zoom") },
  { value: "yearly", label: "Yıllık" },
];

/** K2 — barlarda yüzde basılmamasının GÖRÜNÜR gerekçesi. */
const PROGRESS_NOTE = pendingModuleLabel("timeline_progress_pct");
/** K6 — "Toplam Hakediş" kutusunun GÖRÜNÜR gerekçesi. */
const PAYMENT_TOTAL_NOTE = pendingModuleLabel("portfolio_progress_payment_total");

export const ZOOM_PARAM = "gorunum";
const ZOOM_VALUES: Record<string, TimelineZoom> = { aylik: "monthly", yillik: "yearly" };
const ZOOM_SLUGS: Record<TimelineZoom, string> = { monthly: "aylik", yearly: "yillik" };

export function parseZoom(raw: string | null): TimelineZoom {
  return (raw !== null && ZOOM_VALUES[raw]) || "monthly";
}

/** Bir kaydırma adımı — ızgaranın görünür genişliğinin yarısı. */
const SCROLL_STEP_RATIO = 0.5;

export function ProjectTimelineView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const zoom = parseZoom(searchParams.get(ZOOM_PARAM));

  const timelineQuery = useProjectTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>());

  const toggleProject = useCallback((projectId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  function changeZoom(next: TimelineZoom) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "monthly") params.delete(ZOOM_PARAM);
    else params.set(ZOOM_PARAM, ZOOM_SLUGS[next]);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function scrollGrid(direction: -1 | 1) {
    const node = scrollRef.current;
    if (node === null) return;
    node.scrollBy({ left: direction * node.clientWidth * SCROLL_STEP_RATIO });
  }

  function scrollToToday() {
    const node = scrollRef.current;
    if (node === null) return;
    const line = node.querySelector<HTMLElement>("[data-testid='tkv-today-line']");
    if (line === null) return;
    node.scrollTo({ left: Math.max(0, line.offsetLeft - node.clientWidth / 2) });
  }

  if (isForbidden(timelineQuery.error)) return <AccessDenied />;
  if (timelineQuery.isError) {
    return <p className="tkv__message">Proje takvimi yüklenemedi</p>;
  }
  if (timelineQuery.isLoading || !timelineQuery.data) {
    return <p className="tkv__message">Yükleniyor…</p>;
  }

  const { today, items } = timelineQuery.data;
  const win = timelineWindow(windowRanges(items));
  const rows = buildRows(items, collapsed);
  const summary = portfolioSummary(items, today);

  // Görünür gerekçeler ÖĞELERDEN türer (F-PRJTAB kanonu): öğe canlanınca not
  // kendiliğinden kalkar, elle silinmesi gerekmez.
  const notes = [
    PROGRESS_NOTE,
    ...ZOOM_OPTIONS.map((option) => option.disabledReason).filter(
      (reason): reason is string => reason !== undefined,
    ),
  ];
  const hasUndatedRow = rows.some((row) => {
    const source = row.kind === "project" ? row.project : row.section;
    return source.start_date === null || source.end_date === null;
  });
  if (hasUndatedRow) {
    notes.push("Başlangıç/bitiş tarihi girilmemiş satırlar bar çizmez — satır listede kalır.");
  }

  return (
    <div className="tkv" data-testid="tkv">
      <div className="tkv__toolbar">
        <button
          type="button"
          className="tkv__nav-btn"
          aria-label="Izgarayı geriye kaydır"
          onClick={() => scrollGrid(-1)}
        >
          ‹
        </button>
        <span className="tkv__range" data-testid="tkv-range">
          {win === null ? "—" : timelineWindowLabel(win)}
        </span>
        <button
          type="button"
          className="tkv__nav-btn"
          aria-label="Izgarayı ileriye kaydır"
          onClick={() => scrollGrid(1)}
        >
          ›
        </button>
        <button type="button" className="tkv__today-btn" onClick={scrollToToday}>
          Bugün
        </button>

        <div className="tkv__zoom" role="group" aria-label="Görünüm">
          {ZOOM_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="tkv__zoom-btn"
              data-testid={`tkv-zoom-${option.value}`}
              disabled={option.disabledReason !== undefined}
              aria-current={option.value === zoom ? "true" : undefined}
              onClick={
                option.disabledReason === undefined
                  ? () => changeZoom(option.value as TimelineZoom)
                  : undefined
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <ul className="tkv__legend tkv-palette">
          {STATUS_LEGEND.map((entry) => (
            <li key={entry.status} className="tkv__legend-item">
              <span
                className={`tkv__legend-swatch tkv__bar--${entry.status}`}
                aria-hidden="true"
              />
              {entry.label}
            </li>
          ))}
          <li className="tkv__legend-item">
            <span className="tkv__legend-swatch tkv__legend-swatch--today" aria-hidden="true" />
            Bugün
          </li>
          <li className="tkv__legend-item">
            <span
              className="tkv__legend-swatch tkv__legend-swatch--milestone"
              aria-hidden="true"
            />
            Milestone
          </li>
        </ul>
      </div>

      <div className="tkv__notes" data-testid="tkv-notes">
        {notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </div>

      {win === null ? (
        <p className="tkv__message" data-testid="tkv-empty">
          {items.length === 0
            ? "Portföyde proje yok — takvim çizilecek bir kayıt bulunamadı."
            : "Projelerin hiçbirinde başlangıç/bitiş tarihi yok — zaman ızgarası kurulamıyor."}
        </p>
      ) : (
        <TimelineBoard
          ref={scrollRef}
          rows={rows}
          window={win}
          zoom={zoom}
          today={today}
          onToggleProject={toggleProject}
        />
      )}

      <div className="tkv__summary" data-testid="tkv-summary">
        <span className="tkv__summary-title">Portföy Özeti</span>
        <ul className="tkv__summary-list">
          <li className="tkv__summary-item">
            <span className="tkv__summary-label">Toplam Sözleşme</span>
            <span className="tkv__summary-value" data-testid="tkv-total-contract">
              {summary.totalContract === null ? "—" : formatCompactCurrency(summary.totalContract)}
            </span>
          </li>
          <li className="tkv__summary-item">
            <span className="tkv__summary-label">Toplam Hakediş</span>
            <span
              className="tkv__summary-value tkv__summary-value--pending"
              data-testid="tkv-total-payment"
            >
              —
            </span>
            <span className="tkv__summary-hint">{PAYMENT_TOTAL_NOTE}</span>
          </li>
          <li className="tkv__summary-item">
            <span className="tkv__summary-label">Aktif Proje</span>
            <span
              className="tkv__summary-value tkv__summary-value--success"
              data-testid="tkv-active-count"
            >
              {summary.activeCount}
            </span>
          </li>
          <li className="tkv__summary-item">
            <span className="tkv__summary-label">Yaklaşan Teslimat</span>
            <span
              className="tkv__summary-value tkv__summary-value--warning"
              data-testid="tkv-next-delivery"
            >
              {summary.nextDeliveryIso === null ? "—" : monthLabel(summary.nextDeliveryIso)}
            </span>
          </li>
        </ul>
        <span className="tkv__summary-today" data-testid="tkv-today-stamp">
          Bugün: {formatDateLong(today)}
          <span className="tkv__summary-dot" aria-hidden="true">
            <svg width="8" height="8" viewBox="0 0 8 8" focusable="false">
              <circle cx="4" cy="4" r="4" fill="currentColor" />
            </svg>
          </span>
        </span>
      </div>
    </div>
  );
}

function monthLabel(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  if (year === undefined || month === undefined) return iso;
  return formatPeriodShort(year, month);
}
