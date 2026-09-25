import type { ReactNode } from "react";

import { ReadOnlyStrip } from "@/components/earned-value/common/state";
import type {
  DiaryDetailContext,
  DiaryDetailExtension,
  DiaryDetailKpi,
  DiaryDetailLineColumns,
  DiaryDetailLineRef,
} from "@/components/site-diary-detail/detail-extension";
import type { DiaryLineRef } from "@/components/site-diary/diary-extension";
import type { EvDayProgress, EvDayView } from "@/lib/api/models";
import type { PfBandSettings } from "@/lib/earned-value";

import type { CodeIndex } from "../diary/code-tree";
import { formatDayWeek } from "../diary/day-header";
import type { ItemFacts } from "../diary/item-meta";
import { formatEarned, lineProgress } from "../diary/line-progress";
import { PfBadge } from "../diary/PfBadge";
import { hourSummary, sectionProgress, type SectionProgress } from "./detail-progress";
import { HourSummaryBlock } from "./HourSummaryBlock";

/**
 * DET-1.3 · Planlama → günlük kayıt DETAYI yuvaları (`DiaryDetailExtension`).
 *
 * Değerler motorun gün payload'ındandır (`days/{day}`): satır hücreleri
 * yapraktan (`lineProgress` — günlük ekranıyla AYNI eşleme), gün toplamı
 * `progress.*`, "bu bölüm" ara toplamı/KPI'sı bölüm yapraklarının toplamı
 * (`sectionProgress`). Mockup: Günlük Kayıt Detay (Salt Okunur) 208-458.
 */
export interface DetailExtensionInput {
  ctx: DiaryDetailContext;
  view: EvDayView;
  index: CodeIndex;
  bands: PfBandSettings;
  itemFacts: ItemFacts;
}

const HEADERS: DiaryDetailLineColumns["headers"] = [
  // 315 — "Bugün kaz. a-s" mavi başlık (İ:220)
  { key: "ev-earned", label: <span className="ev-diary-col-earned">Bugün kaz. a-s</span>, width: 76 },
  { key: "ev-pf", label: "PF", width: 58 },
];

function Earned({ value, isNone = false }: { value: string | null; isNone?: boolean }) {
  return <span className={isNone ? "ev-diary-earned ev-diary-earned--none" : "ev-diary-earned"}>{formatEarned(value)}</span>;
}

function toDiaryLine(line: DiaryDetailLineRef): DiaryLineRef | null {
  if (line.boqItemId === null) return null;
  return { key: line.lineId, boqItemId: line.boqItemId, sectionId: line.sectionId, quantityToday: null };
}

function progressCells(value: { earned: string | null; pf: string | null }, bands: PfBandSettings): ReactNode[] {
  return [<Earned key="earned" value={value.earned} />, <PfBadge key="pf" value={value.pf} bands={bands} />];
}

function spentNote(spent: string): string {
  return `harcanan ${formatEarned(spent)} a-s`;
}

/** 384 — İ:242-243 oransız alt satır; ✕ glifi ve "Adam-Saat Bütçesi →" salt okunur sayfada YOK. */
function UnratedNotice() {
  return (
    <div className="ev-diary-norate ev-detail-norate" role="note">
      <span className="ev-diary-norate__lead">Bu kaleme oran atanmamış</span>
      <span className="ev-diary-norate__text">Miktar kaydedildi, kazanılmış hesaplanmadı.</span>
    </div>
  );
}

function lineColumns({ view, index, bands, itemFacts }: DetailExtensionInput): DiaryDetailLineColumns {
  const progress: EvDayProgress | null = view.progress;
  return {
    headers: HEADERS,
    renderCells: (line) => {
      const ref = toDiaryLine(line);
      if (ref === null) return [<Earned key="earned" value={null} isNone />, <PfBadge key="pf" value={null} bands={bands} />];
      const cell = lineProgress(ref, progress, index);
      return [
        <span key="earned" className={cell.noRate ? "ev-diary-earned ev-diary-earned--none" : "ev-diary-earned"}>
          {cell.earned}
        </span>,
        <PfBadge key="pf" value={cell.pf} bands={bands} />,
      ];
    },
    renderSubRow: (line) => {
      const ref = toDiaryLine(line);
      return ref !== null && lineProgress(ref, progress, index).noRate ? <UnratedNotice /> : null;
    },
    renderSectionSubtotal: (sectionId) => {
      const section = sectionProgress(progress, sectionId);
      return { note: spentNote(section.spent), cells: progressCells(section, bands) };
    },
    dayTotal:
      progress === null
        ? null
        : {
            label: (
              <>
                Günün toplamı (tüm bölümler) · kazanılmış · harcanan{" "}
                <span className="ev-diary-mono">{formatEarned(progress.spent_day)}</span> a-s
              </>
            ),
            cells: [
              <span key="earned" className="ev-diary-earned ev-detail-day-earned">
                {formatEarned(progress.earned_day)}
              </span>,
              <PfBadge key="pf" value={progress.pf_day} bands={bands} />,
            ],
          },
    captionSuffix:
      view.revision_number === null ? undefined : `kazanılmış = bugün miktar × birim oran (Rev ${view.revision_number})`,
    renderLineTag: (line) => (line.boqItemId === null ? null : itemFacts.contractorLabel(line.boqItemId)),
  };
}

/** "Bu bölüm" (bağlam yoksa günün tümü) kazanılmış/harcanan/PF — KPI kaynağı. */
function kpiProgress({ ctx, view }: DetailExtensionInput): SectionProgress {
  if (ctx.currentSectionId !== null) return sectionProgress(view.progress, ctx.currentSectionId);
  return {
    earned: view.progress?.earned_day ?? "0",
    spent: view.progress?.spent_day ?? "0",
    pf: view.progress?.pf_day ?? null,
  };
}

function kpis(input: DetailExtensionInput): DiaryDetailKpi[] {
  const value = kpiProgress(input);
  return [
    {
      key: "ev-earned",
      label: "Bugün kazanılmış",
      value: (
        <span className="ev-detail-kpi-earned">
          {formatEarned(value.earned)} <span className="ev-detail-kpi-unit">a-s</span>
        </span>
      ),
      note: spentNote(value.spent),
    },
    {
      key: "ev-pf",
      label: "Bugün PF",
      value: <PfBadge value={value.pf} bands={input.bands} className="ev-detail-kpi-pf" />,
      note: "kazanılmış ÷ harcanan",
    },
  ];
}

export function buildDetailExtension(input: DetailExtensionInput): DiaryDetailExtension {
  const { ctx, view, index, bands } = input;
  return {
    headerSuffix: formatDayWeek(view.day_no, view.week_no) ?? undefined,
    kpis: kpis(input),
    lineColumns: lineColumns(input),
    fullWidthBlock: (
      <HourSummaryBlock
        view={view}
        summary={hourSummary(view, index, ctx.currentSectionId)}
        bands={bands}
        currentSectionName={ctx.currentSectionId === null ? null : ctx.currentSectionName}
        openHref={ctx.openHref}
      />
    ),
  };
}

/** Hâl (i) — `earned_value` görüntüleme izni yok: yalnız şerit (PNL:440 compact). */
export function PlanningHiddenNotice() {
  return (
    <ReadOnlyStrip className="ev-detail-hidden-strip">
      Planlama sütunları gizli · Planlama görüntüleme izniniz yok
    </ReadOnlyStrip>
  );
}
