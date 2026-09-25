"use client";

import Link from "next/link";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { ErrorCard, ReadOnlyStrip } from "@/components/earned-value/common/state";
import { Select } from "@/components/ui/select/Select";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented/Segmented";
import { ReportDateNav } from "../kit/ReportDateNav";
import { TreeTable } from "../../common/tree-table/TreeTable";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { usePanel, type ContractorFilter, type PanelRange } from "@/lib/api/hooks/useEvReports";
import { isForbidden } from "@/lib/api/unwrap";
import { EMPTY_CELL, formatDateDots, formatDecimal } from "@/lib/format";
import type { ReportScreenProps } from "../kit/report-screen";

import { usePanelUrlState } from "./panel-url-state";
import { panelScreenState } from "./panel-screen-state";
import { PanelLoadingSkeleton } from "./PanelLoadingSkeleton";
import { PanelBaselineEmptyState } from "./PanelBaselineEmptyState";
import { PanelNoFieldDataState } from "./PanelNoFieldDataState";
import { PanelKpiRow } from "./PanelKpiRow";
import { PanelWarningsCard } from "./PanelWarningsCard";
import { PanelSCurveChart } from "./PanelSCurveChart";
import { PanelDailyBarsChart } from "./PanelDailyBarsChart";
import { PanelPfTrendChart } from "./PanelPfTrendChart";
import { PanelHistogramChart } from "./PanelHistogramChart";
import { PANEL_COLUMNS } from "./panel-columns";
import { buildPanelTree } from "./panel-tree";
import "./panel-screen.css";

const RANGE_OPTIONS: readonly SegmentedOption<PanelRange>[] = [
  { value: "4w", label: "4 hafta" },
  { value: "3m", label: "3 ay" },
  { value: "all", label: "Tümü" },
];

const RANGE_LABEL: Record<PanelRange, string> = { "4w": "son 4 hafta", "3m": "son 3 ay", all: "tüm süre" };

type OwnerValue = ContractorFilter | "all";
const OWNER_OPTIONS: readonly SegmentedOption<OwnerValue>[] = [
  { value: "own", label: "Kendi" },
  { value: "subcon", label: "Taşeron" },
  { value: "all", label: "Hepsi" },
];
const OWNER_LABEL: Record<OwnerValue, string> = { own: "Kendi", subcon: "Taşeron", all: "Kendi + Taşeron" };

/**
 * PLN-F3.3 · Planlama Paneli — Panel:79-448. URL durumu `?tarih&aralik&
 * disiplin&yuklenici` (kök ikizde + `?site=`, `useEvSiteParam` çağıranda).
 * F3-SOZLESME.md §0: disiplin/kendi-taşeron filtresi BACKEND'e query olarak
 * gider (`usePanel`) — istemci hiçbir satırı/uyarıyı KENDİSİ süzmez, S8
 * görünürlük süzgeci BİLE zaten-filtrelenmiş `report.rows`e göre çalışır.
 */
export function PanelScreen({ siteId, siteName, companyName, projectName, siteCompleted, links, picker }: ReportScreenProps) {
  const permission = useModulePermission("earned_value");
  const url = usePanelUrlState();
  const report = usePanel(siteId, {
    date: url.date,
    range: url.range,
    disciplineId: url.disciplineId,
    contractorType: url.contractorType,
  });

  const breadcrumb = [companyName, projectName, siteName].filter((part) => part !== "").join(" · ");
  const state = panelScreenState({
    siteId,
    isForbidden: isForbidden(report.error),
    isError: report.isError,
    isLoading: report.isLoading,
    hasBaseline: report.data?.has_baseline,
    hasFieldData: report.data?.has_field_data,
  });

  const ownerValue: OwnerValue = url.contractorType ?? "all";
  const canDistribute = permission.canWrite && !siteCompleted;

  return (
    <div className="ev-panel">
      <div className="ev-panel__head">
        <div>
          <h1 className="ev-panel__title">Planlama Paneli</h1>
          {breadcrumb !== "" && <p className="ev-panel__subtitle">{breadcrumb}</p>}
        </div>
        {picker}
      </div>

      {siteCompleted && (
        <ReadOnlyStrip variant="compact">Görüntüleyici · yalnız okuma</ReadOnlyStrip>
      )}

      {state === "site" ? null : (
        <div className="ev-panel__toolbar">
          <ReportDateNav
            mode="day"
            day={url.date}
            dayNo={report.data?.day_no ?? null}
            weekNo={report.data?.week_no ?? null}
            min={report.data?.calendar_start ?? null}
            max={report.data?.calendar_end ?? null}
            onChange={url.setDate}
          />
          <Segmented aria-label="Zaman aralığı" options={RANGE_OPTIONS} value={url.range} onChange={url.setRange} />
          <Select
            aria-label="Disiplin"
            value={url.disciplineId ?? ""}
            onChange={(event) => url.setDisciplineId(event.target.value === "" ? null : event.target.value)}
          >
            <option value="">Tüm disiplinler</option>
            {(report.data?.disciplines ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Segmented
            aria-label="Kendi / Taşeron"
            options={OWNER_OPTIONS}
            value={ownerValue}
            onChange={(value) => url.setContractorType(value === "all" ? null : value)}
          />
          {report.data?.revision && (
            <span className="ev-panel__baseline-chip">
              Baseline: <b>Rev {report.data.revision.number}</b>
              {report.data.revision.frozen_at !== null && (
                <span className="ev-panel__baseline-chip-date">{formatDateDots(report.data.revision.frozen_at.slice(0, 10))}</span>
              )}
            </span>
          )}
        </div>
      )}

      {state === "site" && <p className="ev-panel__pending">Şantiye seçilmedi.</p>}
      {state === "forbidden" && <AccessDenied />}
      {state === "error" && (
        <ErrorCard title="Panel verisi alınamadı" description="Hesaplama servisi yanıt vermedi. Girilen veriler kaybolmadı." onRetry={() => void report.refetch()} retrying={report.isFetching} />
      )}
      {state === "loading" && <PanelLoadingSkeleton />}
      {state === "no-baseline" && <PanelBaselineEmptyState budgetHref={links.budget} />}
      {state === "no-field-data" && report.data && <PanelNoFieldDataState sCurve={report.data.s_curve} />}

      {state === "loaded" && report.data && (
        <>
          <PanelKpiRow kpi={report.data.kpi} weekNo={report.data.week_no} distributeHref={links.diary(report.data.day)} canDistribute={canDistribute} />

          <div className="ev-panel__row">
            <PanelSCurveChart sCurve={report.data.s_curve} revisionNumber={report.data.revision?.number ?? null} />
            <PanelWarningsCard warnings={report.data.warnings} visibleRows={report.data.rows} links={links} />
          </div>

          <div className="ev-panel__charts-grid">
            <PanelDailyBarsChart bars={report.data.bars} />
            <PanelPfTrendChart pfTrend={report.data.pf_trend} pfBands={report.data.pf_bands ?? null} rangeLabel={RANGE_LABEL[url.range]} />
            <PanelHistogramChart histogram={report.data.histogram} rangeLabel={RANGE_LABEL[url.range]} actualBasis={report.data.actual_basis} />
          </div>

          <div className="ev-panel__table-card">
            <div className="ev-panel__table-head">
              <span className="ev-panel__table-title">Disiplin tablosu</span>
              <span className="ev-panel__table-note">
                {formatDateDots(report.data.day)} · {url.disciplineId === null ? "tüm disiplinler" : ((report.data.disciplines ?? []).find((d) => d.id === url.disciplineId)?.name ?? "")} · {OWNER_LABEL[ownerValue]} · tolerans ±{report.data.tolerance_points === null ? EMPTY_CELL : formatDecimal(report.data.tolerance_points, 1)} puan
              </span>
              <Link href={links.dailyReport(report.data.day)} className="ev-panel__table-link">
                Günlük İlerleme Raporu →
              </Link>
            </div>
            <TreeTable
              nodes={buildPanelTree(report.data.rows)}
              columns={PANEL_COLUMNS}
              getLabel={(node) => node.data.name}
              variant="panel"
              ariaLabel="Disiplin tablosu"
              emptyText={`Seçilen filtrede kalem yok · ${url.disciplineId === null ? "Tüm disiplinler" : ((report.data.disciplines ?? []).find((d) => d.id === url.disciplineId)?.name ?? "")} disiplini ${OWNER_LABEL[ownerValue]} ile yapılmıyor.`}
              collapsible
            />
          </div>
        </>
      )}
    </div>
  );
}
