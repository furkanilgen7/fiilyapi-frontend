"use client";

import Link from "next/link";
import { useState } from "react";

import { TreeTable } from "@/components/earned-value/common/tree-table/TreeTable";
import { ErrorCard, ReadOnlyStrip, Skeleton, SkeletonRows } from "@/components/earned-value/common/state";
import { ReportDateNav } from "@/components/earned-value/reports/kit/ReportDateNav";
import { PfBandCell } from "@/components/earned-value/reports/kit/PfBandCell";
import { StatusMark } from "@/components/earned-value/reports/kit/StatusMark";
import { WeatherStrip } from "@/components/earned-value/reports/kit/WeatherStrip";
import type { ReportScreenProps } from "@/components/earned-value/reports/kit/report-screen";
import { Button, Segmented } from "@/components/ui";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { useApproveDailyReport, useDailyReport } from "@/lib/api/hooks/useEvReports";
import { backendErrorMessage } from "@/lib/api/error-message";
import { formatPercent01, formatPf, formatVariancePoints } from "@/lib/earned-value";
import { EMPTY_CELL, formatDateDots, formatDateLong, formatDateTimeDots, formatQuantity } from "@/lib/format";
import type { EvDailyReport } from "@/lib/api/models";

import { QUANTITY_COLUMNS } from "./daily-columns";
import { DailyApproveModal } from "./DailyApproveModal";
import { DailyPrintView } from "./DailyPrintView";
import { approveGate, reportEyebrow, reportNoLabel, versionSuffix } from "./daily-logic";
import { pfOutOfBandRows } from "./pf-out-of-band";
import { buildTrendChart } from "./trend-chart";
import { buildQuantityTree } from "./quantity-tree";
import { useDailyReportUrlState } from "./daily-url-state";

import "./daily-report.css";

type ViewMode = "screen" | "print";

const VIEW_OPTIONS = [
  { value: "screen" as const, label: "Ekran" },
  { value: "print" as const, label: "Yazdırma önizlemesi" },
];

function statusBadge(report: EvDailyReport) {
  if (report.status === "not_generated") return { text: "Üretilemedi", tone: "warning" as const };
  if (report.status === "approved") {
    const who = report.approved_by?.full_name ?? EMPTY_CELL;
    const when = report.approved_at === null ? "" : `, ${formatDateTimeDots(report.approved_at)}`;
    return { text: `Onaylandı — ${who}${when}${versionSuffix(report.status, report.version)}`, tone: "success" as const };
  }
  return { text: "Taslak", tone: "neutral" as const };
}

/** GİR:112-118 — eksik/taslak günlük bandı; S11 "günlüğü yok"; "Günlük Kayıt →" bağlantısı `links.diary`. */
function MissingDiaryBand({ report, diaryHref }: { report: EvDailyReport; diaryHref: string }) {
  if (report.draft_diary_dates.length === 0) return null;
  return (
    <div className="ev-daily-missing-band" role="note">
      <b>{report.draft_diary_dates.map((d) => formatDateDots(d)).join(", ")} günlükleri gönderilmedi;</b> rapor eksik
      veriyle üretildi. Bu günlerin miktar ve saatleri taslak değer olarak kullanıldı.
      <Link href={diaryHref} className="ev-daily-missing-band__link">
        Günlük Kayıt →
      </Link>
    </div>
  );
}

function KpiTable({ report }: { report: EvDailyReport }) {
  return (
    <div className="ev-daily-kpi">
      <table className="ev-daily-kpi__table">
        <thead>
          <tr>
            <th>Disiplin</th>
            <th>Günlük planlı %</th>
            <th>Günlük gerçek %</th>
            <th>Günlük harcanan</th>
            <th>Günlük kazanılmış</th>
            <th>Günlük PF</th>
            <th>Küm. PF</th>
            <th>Küm. planlı %</th>
            <th>Küm. gerçek %</th>
            <th>Sapma</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {report.kpis.map((row) => {
            const isOverall = row.kind.startsWith("overall");
            const chip = row.contractor_mix === "own" ? "Kendi" : row.contractor_mix === "subcon" ? "Taşeron" : null;
            return (
              <tr key={row.node_id ?? row.kind} className={isOverall ? "ev-daily-kpi__overall" : undefined}>
                <td className="ev-daily-kpi__name">
                  <span>{row.name ?? EMPTY_CELL}</span>
                  {chip !== null && <span className="ev-daily-kpi__chip">{chip}</span>}
                </td>
                <td>{row.planned_pct_day === null ? EMPTY_CELL : formatPercent01(row.planned_pct_day)}</td>
                <td>{row.progress_pct_day === null ? EMPTY_CELL : formatPercent01(row.progress_pct_day)}</td>
                <td>{formatQuantity(row.spent_day)}</td>
                <td>{formatQuantity(row.earned_day)}</td>
                <td>
                  <PfBandCell as="span" value={row.pf_day === null ? null : formatPf(row.pf_day)} band={row.pf_day_band ?? "none"} />
                </td>
                <td>
                  <PfBandCell as="span" value={row.pf_cum === null ? null : formatPf(row.pf_cum)} band={row.pf_cum_band ?? "none"} />
                </td>
                <td>{row.planned_pct_cum === null ? EMPTY_CELL : formatPercent01(row.planned_pct_cum)}</td>
                <td>{row.progress_pct_cum === null ? EMPTY_CELL : formatPercent01(row.progress_pct_cum)}</td>
                <td>{row.variance === null ? EMPTY_CELL : formatVariancePoints(row.variance)}</td>
                <td>
                  <StatusMark status={row.status ?? "none"} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendSection({ report }: { report: EvDailyReport }) {
  const chart = buildTrendChart(report.trend);
  return (
    <div className="ev-daily-trend">
      <table className="ev-daily-trend__table">
        <thead>
          <tr>
            <th>Gün</th>
            {report.trend.map((t) => (
              <th key={t.day} className={t.is_future ? "ev-daily-trend__future" : undefined}>
                {formatDateDots(t.day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Planlı %</td>
            {report.trend.map((t) => (
              <td key={t.day}>{t.is_future || t.planned_pct_cum === null ? EMPTY_CELL : formatPercent01(t.planned_pct_cum)}</td>
            ))}
          </tr>
          <tr>
            <td>Gerçek %</td>
            {report.trend.map((t) => (
              <td key={t.day}>
                {t.is_draft && <span className="ev-daily-trend__draft-dot" title="Gönderilmedi · taslak" />}
                {t.is_future || t.progress_pct_cum === null ? EMPTY_CELL : formatPercent01(t.progress_pct_cum)}
              </td>
            ))}
          </tr>
          <tr>
            <td>Fark (puan)</td>
            {report.trend.map((t) => (
              <td key={t.day}>{t.is_future || t.delta === null ? EMPTY_CELL : formatVariancePoints(t.delta)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {chart !== null && (
        <svg viewBox="0 0 420 160" className="ev-daily-trend__chart" role="img" aria-label="7 günlük kümülatif ilerleme grafiği">
          <path d={chart.plannedPath} fill="none" className="ev-daily-trend__line ev-daily-trend__line--planned" />
          <path d={chart.actualPath} fill="none" className="ev-daily-trend__line ev-daily-trend__line--actual" />
          {chart.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.2} className={p.isDraft ? "ev-daily-trend__point--draft" : "ev-daily-trend__point"} />
          ))}
        </svg>
      )}
    </div>
  );
}

function QuantitySection({ report }: { report: EvDailyReport }) {
  const tree = buildQuantityTree(report.quantities);
  const overall = report.kpis.find((k) => k.kind === "overall") ?? null;
  return (
    <div className="ev-daily-qty">
      <TreeTable
        nodes={tree}
        columns={QUANTITY_COLUMNS}
        getLabel={(node) => node.data.name}
        variant="progress"
        collapsible={false}
        ariaLabel="Miktar tablosu"
        emptyText="Miktar satırı yok."
        className="ev-daily-qty__table"
      />
      {overall !== null && (
        <div className="ev-daily-qty__total">
          <span>Toplam doğrudan</span>
          <PfBandCell as="span" value={overall.pf_day === null ? null : formatPf(overall.pf_day)} band={overall.pf_day_band ?? "none"} />
          <span>{formatQuantity(overall.spent_day)}</span>
          <span>{overall.progress_pct_cum === null ? EMPTY_CELL : formatPercent01(overall.progress_pct_cum)}</span>
        </div>
      )}
    </div>
  );
}

/** Mutabakat + oransız giriş + PF bant dışı — GİR:273-295. */
function FooterSection({ report, diaryHref, weeklyHref }: { report: EvDailyReport; diaryHref: string; weeklyHref: string }) {
  const footer = report.footer;
  const outOfBand = pfOutOfBandRows(report.warnings, report.quantities);
  return (
    <div className="ev-daily-footer">
      {footer !== null && (
        <div className="ev-daily-footer__chips">
          <span className="ev-daily-footer__chip ev-daily-footer__chip--ok">
            Σ harcanan {formatQuantity(footer.spent_total_day)} a-s + dağıtılmamış {formatQuantity(footer.undistributed_day)} a-s = Σ
            puantaj {formatQuantity(footer.timesheet_total_day)} a-s
          </span>
          {Number(footer.undistributed_day) > 0 && (
            <span className="ev-daily-footer__chip ev-daily-footer__chip--warn">
              {formatQuantity(footer.undistributed_day)} a-s dağıtılmamış · PF hesabına girmedi
              {footer.undistributed_reason !== null && ` · gerekçe: ${footer.undistributed_reason}`}
            </span>
          )}
          {Number(footer.unallocated_day) > 0 && (
            // S20 — atanamayan saat (miktarsız gün), ayrı satır.
            <span className="ev-daily-footer__chip ev-daily-footer__chip--warn">
              Atanamayan saat (miktarsız gün): {formatQuantity(footer.unallocated_day)} a-s
            </span>
          )}
        </div>
      )}

      {report.unrated_entries.length > 0 && (
        <div className="ev-daily-footer__chips">
          {report.unrated_entries.map((w, i) => (
            <span key={i} className="ev-daily-footer__chip ev-daily-footer__chip--danger">
              {w.item_name ?? w.message}
              {w.section_name !== null && w.section_name !== undefined && ` · ${w.section_name}`}
              {w.value !== null && w.value !== undefined && ` · ${formatQuantity(w.value)}${w.uom ? ` ${w.uom}` : ""}`}{" "}
              oransız — rapora girmedi
            </span>
          ))}
        </div>
      )}

      <div className="ev-daily-footer__meta">
        <span>
          Üretim <span className="ev-daily-footer__mono">{formatDateTimeDots(report.generated_at)}</span>
        </span>
        <span>
          Rapor no <span className="ev-daily-footer__mono">{reportNoLabel(report.report_no)}</span>
        </span>
        <span>Kaynak: Günlük Kayıt + Puantaj + Adam-Saat Bütçesi {report.revision?.name ?? EMPTY_CELL}</span>
        <span>{report.status === "approved" ? `Onaylayan: ${report.approved_by?.full_name ?? EMPTY_CELL}` : "Onay bekliyor"}</span>
      </div>

      {outOfBand.length > 0 && (
        <div className="ev-daily-footer__pf-table">
          <div className="ev-daily-footer__pf-title">PF bant dışı kalemler (Kalem · Disiplin · Günlük PF · Küm. PF)</div>
          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Disiplin</th>
                <th>Günlük PF</th>
                <th>Küm. PF</th>
              </tr>
            </thead>
            <tbody>
              {outOfBand.map((row) => (
                <tr key={row.key}>
                  <td>{row.itemName}</td>
                  <td>{row.disciplineName ?? EMPTY_CELL}</td>
                  <td>
                    <PfBandCell as="span" value={row.dayValue === null ? null : formatPf(row.dayValue)} band={row.dayBand} />
                  </td>
                  <td>
                    <PfBandCell as="span" value={row.cumValue === null ? null : formatPf(row.cumValue)} band={row.cumBand} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ev-daily-footer__links">
        <Link href={diaryHref} className="ev-daily-footer__diary-link">
          Günlük Kayıt →
        </Link>
        <Link href={weeklyHref} className="ev-daily-footer__weekly-link">
          Haftalık QURR →
        </Link>
      </div>
    </div>
  );
}

interface LoadedProps extends ReportScreenProps {
  report: EvDailyReport;
  date: string;
  onDateChange: (date: string) => void;
  refetch: () => void;
  isRefetching: boolean;
}

function LoadedDailyReport({
  siteId,
  siteName,
  companyName,
  projectName,
  siteCompleted,
  links,
  picker,
  report,
  date,
  onDateChange,
  refetch,
  isRefetching,
}: LoadedProps) {
  const permission = useModulePermission("earned_value");
  const approve = useApproveDailyReport(siteId);
  const eyebrow = reportEyebrow(companyName, projectName, siteName);
  const [view, setView] = useState<ViewMode>("screen");
  const [modalOpen, setModalOpen] = useState(false);
  const [showArchiveDetail, setShowArchiveDetail] = useState(report.status !== "approved");

  const badge = statusBadge(report);
  const gate = approveGate({
    level: permission.level,
    siteCompleted,
    status: report.status,
    draftDiaryDates: report.draft_diary_dates,
  });

  if (report.status === "not_generated") {
    return (
      <div className="ev-daily-report">
        <Toolbar
          report={report}
          date={date}
          onDateChange={onDateChange}
          view={view}
          setView={setView}
          gate={gate}
          onOpenModal={() => setModalOpen(true)}
          onRefresh={refetch}
          isRefreshing={isRefetching}
        />
        <div className="ev-daily-empty" role="status">
          <div className="ev-daily-empty__title">{formatDateDots(report.report_date)} günlüğü yok — rapor üretilemedi</div>
          <p className="ev-daily-empty__text">
            Mühendis miktarları girip saatleri dağıttıktan sonra &quot;Gönder&quot; dediğinde rapor kendiliğinden
            üretilir.
          </p>
          <Link href={links.diary(report.report_date)} className="ev-daily-empty__link">
            Günlük Kayıt&apos;a git
          </Link>
        </div>
      </div>
    );
  }

  // S30 — geçmiş onaylı gün: özet kart + "Raporu göster".
  if (report.status === "approved" && !showArchiveDetail) {
    const overall = report.kpis.find((k) => k.kind === "overall") ?? null;
    return (
      <div className="ev-daily-report">
        <Toolbar
          report={report}
          date={date}
          onDateChange={onDateChange}
          view={view}
          setView={setView}
          gate={gate}
          onOpenModal={() => setModalOpen(true)}
          onRefresh={refetch}
          isRefreshing={isRefetching}
        />
        <div className="ev-daily-archive-summary">
          <div className="ev-daily-archive-summary__title">
            <span>{formatDateDots(report.report_date)} raporu · arşiv</span>
            <span className="ev-daily-archive-summary__sub">
              Onaylandı — {report.approved_by?.full_name ?? EMPTY_CELL}
              {report.approved_at !== null && `, ${formatDateTimeDots(report.approved_at)}`} ·{" "}
              {reportNoLabel(report.report_no)} · salt okunur
            </span>
          </div>
          {overall !== null && (
            <div className="ev-daily-archive-summary__metrics">
              <span>
                Küm. planlı <b>{overall.planned_pct_cum === null ? EMPTY_CELL : formatPercent01(overall.planned_pct_cum)}</b>
              </span>
              <span>
                Küm. gerçek <b>{overall.progress_pct_cum === null ? EMPTY_CELL : formatPercent01(overall.progress_pct_cum)}</b>
              </span>
              <span>
                Sapma <b>{overall.variance === null ? EMPTY_CELL : formatVariancePoints(overall.variance)}</b>
              </span>
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowArchiveDetail(true)}>
            Raporu göster
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-daily-report">
      <Toolbar
        report={report}
        date={date}
        onDateChange={onDateChange}
        view={view}
        setView={setView}
        gate={gate}
        onOpenModal={() => setModalOpen(true)}
        onRefresh={refetch}
        isRefreshing={isRefetching}
      />
      {report.status === "approved" && (
        <ReadOnlyStrip lead="Onaylandı." action={{ label: "Özete dön", onClick: () => setShowArchiveDetail(false) }}>
          Bu rapor kilitlidir, salt okunur.
        </ReadOnlyStrip>
      )}
      <MissingDiaryBand report={report} diaryHref={links.diary(report.report_date)} />

      {view === "print" ? (
        <DailyPrintView report={report} eyebrow={eyebrow} />
      ) : (
        <div className="ev-daily-report__sheet">
          <header className="ev-daily-head">
            <div className="ev-daily-head__title">
              <span className="ev-daily-head__eyebrow">{eyebrow}</span>
              <span className="ev-daily-head__name">Günlük İlerleme Raporu</span>
              <div className="ev-daily-head__meta">
                <span>
                  Rapor tarihi <b>{formatDateLong(report.report_date)}</b>
                </span>
                <span>
                  Proje günü <b>{report.day_no ?? EMPTY_CELL}</b>
                </span>
                <span>
                  Hafta <b>{report.week_no ?? EMPTY_CELL}</b>
                  {report.week_start !== null && report.week_end !== null && ` · ${formatDateDots(report.week_start)}–${formatDateDots(report.week_end)}`}
                </span>
                <span>
                  Baseline <b>{report.revision?.name ?? EMPTY_CELL}</b>
                </span>
              </div>
            </div>
            <WeatherStrip days={report.weather} reportDate={report.report_date} />
          </header>

          <section aria-label="Disiplin KPI">
            <h2 className="ev-daily-section-title">1 · Disiplin KPI</h2>
            <KpiTable report={report} />
          </section>

          <section aria-label="7 günlük trend">
            <h2 className="ev-daily-section-title">2 · 7 günlük trend · Genel kümülatif</h2>
            <TrendSection report={report} />
          </section>

          <section aria-label="Miktar tablosu">
            <h2 className="ev-daily-section-title">3 · Miktar tablosu</h2>
            <QuantitySection report={report} />
          </section>

          <FooterSection
            report={report}
            diaryHref={links.diary(report.report_date)}
            weeklyHref={links.weeklyReport(report.week_no ?? undefined)}
          />
        </div>
      )}

      {modalOpen && (
        <DailyApproveModal
          reportDate={report.report_date}
          missingDiaryDates={report.missing_diary_dates}
          approve={approve}
          onClose={() => setModalOpen(false)}
          onApproved={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

interface ToolbarProps {
  report: EvDailyReport;
  date: string;
  onDateChange: (date: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  gate: ReturnType<typeof approveGate>;
  onOpenModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/** GİR:99 "↻ Yenile" — ↻ glif alt küme dışı (F3-SÖZLEŞME §3.6) → inline SVG. */
function RefreshGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="ev-daily-toolbar__refresh-icon">
      <path d="M2.5 8a5.5 5.5 0 0 1 9.62-3.64M13.5 8a5.5 5.5 0 0 1-9.62 3.64" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 2.8v2.3h-2.3M3.5 13.2v-2.3h2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Toolbar({ report, date, onDateChange, view, setView, gate, onOpenModal, onRefresh, isRefreshing }: ToolbarProps) {
  const badge = statusBadge(report);
  // GİR:99 `disabled="{{ approved }}"` — onaylı rapor yeniden üretilmez.
  const refreshDisabled = report.status === "approved" || isRefreshing;
  return (
    <div className="ev-daily-toolbar">
      <ReportDateNav mode="day" day={date} dayNo={report.day_no} weekNo={report.week_no} onChange={onDateChange} />
      <span className={`ev-daily-toolbar__badge ev-daily-toolbar__badge--${badge.tone}`}>{badge.text}</span>
      <div className="ev-daily-toolbar__actions">
        <Button variant="secondary" disabled={refreshDisabled} aria-busy={isRefreshing || undefined} onClick={onRefresh}>
          <RefreshGlyph /> Yenile
        </Button>
        <Segmented aria-label="Ekran ya da yazdırma önizlemesi" options={VIEW_OPTIONS} value={view} onChange={setView} size="sm" />
        <Button variant="secondary" onClick={() => window.print()}>
          Yazdır / PDF
        </Button>
        {gate.visible && (
          <Button disabled={gate.disabled} title={gate.reason ?? undefined} onClick={onOpenModal}>
            Onayla ve kilitle
          </Button>
        )}
      </div>
      {gate.disabled && gate.reason !== null && (
        <div className="ev-daily-toolbar__gate-reason" role="note">
          {gate.reason}
        </div>
      )}
    </div>
  );
}

/**
 * PLN-F3.4 · Günlük İlerleme Raporu (GİR) ekranı — F3-SÖZLEŞME §2
 * `ReportScreenProps`. `?tarih=` URL durumunu KENDİSİ okur/yazar (S15).
 */
export function DailyReportScreen(props: ReportScreenProps) {
  const { date, setDate } = useDailyReportUrlState();
  const { data: report, isLoading, isError, error, refetch, isRefetching } = useDailyReport(props.siteId, date);

  if (props.siteId === "") {
    return (
      <div className="ev-daily-report">
        {props.picker}
        <Skeleton label="Şantiye seçiliyor">
          <SkeletonRows columns="2fr 1fr 1fr 1fr" count={4} />
        </Skeleton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ev-daily-report">
        {props.picker}
        <Skeleton label="Rapor yükleniyor">
          <SkeletonRows columns="2fr 1fr 1fr 1fr 1fr 1fr" count={6} />
        </Skeleton>
      </div>
    );
  }

  if (isError || report === undefined) {
    return (
      <div className="ev-daily-report">
        {props.picker}
        <ErrorCard
          title="Rapor alınamadı"
          description={backendErrorMessage(error, "Günlük İlerleme Raporu yüklenemedi.")}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      </div>
    );
  }

  return (
    <>
      {props.picker}
      <LoadedDailyReport
        {...props}
        report={report}
        date={date}
        onDateChange={setDate}
        refetch={() => void refetch()}
        isRefetching={isRefetching}
      />
    </>
  );
}
