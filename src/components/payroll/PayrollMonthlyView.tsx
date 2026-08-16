"use client";

import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Alert, Badge, Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import type {
  PayrollPeriodDetailResponse,
  PayrollPeriodListRow,
  WorkerSource,
} from "@/lib/api/hooks/usePayroll";
import {
  PAYROLL_PERMISSION_MODULE,
  usePayrollPeriod,
  usePayrollPeriods,
} from "@/lib/api/hooks/usePayroll";
import {
  useApprovePayrollPeriod,
  usePayPayrollPeriod,
} from "@/lib/api/hooks/usePayrollMutations";
import { downloadPayrollExport } from "@/lib/api/payroll-client";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { formatDateLong, formatPeriod } from "@/lib/format";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";

import {
  defaultPeriodId,
  orderedSections,
  periodNavigation,
  skipSummary,
  totalLineCount,
  visibleSections,
} from "./payroll-derive";
import { PayrollKpiStrip } from "./PayrollKpiStrip";
import {
  ALL_TAB_LABEL,
  APPROVE_ERROR_FALLBACK,
  APPROVE_RESULT_PREFIX,
  BREADCRUMB,
  DUE_DATE_MISSING,
  DUE_DATE_PREFIX,
  EMPTY_BODY,
  EMPTY_TITLE,
  EXCLUDED_BAND_BODY,
  EXCLUDED_BAND_TITLE,
  EXPORT_LABEL,
  LOADING_MESSAGE,
  NEXT_PERIOD_LABEL,
  PAGE_TITLE,
  PAY_ERROR_FALLBACK,
  PAY_LABEL,
  PAY_RESULT_PREFIX,
  PERIOD_ERROR_FALLBACK,
  PERIOD_STATUS_LABELS,
  PERIOD_STATUS_VARIANTS,
  PERIODS_ERROR_FALLBACK,
  PREV_PERIOD_LABEL,
  SKIP_ALREADY_APPROVED_LABEL,
  SKIP_EXCLUDED_LABEL,
  SKIP_UNAPPROVED_LABEL,
  SKIP_UNCOMPUTED_LABEL,
  SOURCE_ORDER,
  SOURCE_TAB_LABELS,
  UNCOMPUTED_BAND_TITLE,
  UNKNOWN_COST_BAND_TITLE,
} from "./payroll-labels";
import { PayrollPaymentSummary } from "./PayrollPaymentSummary";
import { PayrollTable } from "./PayrollTable";
import "./payroll.css";

/**
 * F-BOR T2 · `/bordro` — Aylık Bordro. Kanon `Bordro Yönetimi.dc.html` ("BY");
 * yorumlardaki sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın üst barı (BY:20-28) ve sol menüsü (BY:31-43) BASILMAZ: ikisi de
 * uygulama kabuğunun (F3) yüzeyidir.
 *
 * 🔴 AY GEZGİNİ (BY:50-54) İSTEMCİDE ADIMLAR: dönem detay ucu `year`/`month`
 * parametresi ALMAZ, liste ucu da yalnız `limit`/`offset` alır. Cömert bir
 * `limit` ile dönemler çekilir, gezgin kronolojik dizide dolaşır ve seçilen
 * kimlikle detay çağrılır. Uydurma sorgu parametresi GÖNDERİLMEZ.
 *
 * 🔴 Seçim URL'de TAŞINMAZ (bileşen state'i) ⇒ `useSearchParams` yoktur ve
 * `Suspense` sarmalayıcısı gerekmez (mali tablolar kanonu).
 */
export function PayrollMonthlyView() {
  const permission = useModulePermission(PAYROLL_PERMISSION_MODULE);
  const periodsQuery = usePayrollPeriods();

  // `null` = kullanıcı henüz seçim yapmadı ⇒ varsayılan (en yeni dönem).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<WorkerSource | null>(null);

  const rows: readonly PayrollPeriodListRow[] = periodsQuery.data?.items ?? [];
  const periodId = selectedId ?? defaultPeriodId(rows);
  const detailQuery = usePayrollPeriod(periodId);

  const approvePeriod = useApprovePayrollPeriod();
  const payPeriod = usePayPayrollPeriod();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!permission.canView || isForbidden(periodsQuery.error) || isForbidden(detailQuery.error)) {
    return <AccessDenied />;
  }

  const periodsError = periodsQuery.isError
    ? backendErrorMessage(periodsQuery.error, PERIODS_ERROR_FALLBACK)
    : undefined;
  const detailError = detailQuery.isError
    ? backendErrorMessage(detailQuery.error, PERIOD_ERROR_FALLBACK)
    : undefined;

  const navigation = periodNavigation(rows, periodId);
  const detail = detailQuery.data;
  const truncation = buildListTruncation(rows.length, periodsQuery.data?.total);

  // 🔴 K7 TEK UÇUŞ: `isPending` doğrudan mutasyondan okunur; ayrı bir local
  // boolean YOKTUR ve her iki düğme de aynı bayrakla kilitlenir.
  const isApprovePending = approvePeriod.isPending;
  const isPayPending = payPeriod.isPending;

  async function handleApproveAll() {
    if (periodId === undefined) return;
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await approvePeriod.mutateAsync(periodId);
      setActionMessage(
        skipSummary(APPROVE_RESULT_PREFIX, result.approved, [
          { label: SKIP_UNCOMPUTED_LABEL, count: result.skipped_uncomputed },
          { label: SKIP_EXCLUDED_LABEL, count: result.skipped_excluded },
          { label: SKIP_ALREADY_APPROVED_LABEL, count: result.skipped_already_approved },
        ]),
      );
    } catch (error) {
      setActionError(backendErrorMessage(error, APPROVE_ERROR_FALLBACK));
    }
  }

  async function handlePay() {
    if (periodId === undefined) return;
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await payPeriod.mutateAsync(periodId);
      setActionMessage(
        skipSummary(PAY_RESULT_PREFIX, result.paid, [
          { label: SKIP_UNAPPROVED_LABEL, count: result.skipped_unapproved },
          { label: SKIP_UNCOMPUTED_LABEL, count: result.skipped_uncomputed },
          { label: SKIP_EXCLUDED_LABEL, count: result.skipped_excluded },
        ]),
      );
    } catch (error) {
      setActionError(backendErrorMessage(error, PAY_ERROR_FALLBACK));
    }
  }

  async function handleExport() {
    if (periodId === undefined) return;
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadPayrollExport(periodId);
    } catch (error) {
      setExportError(backendErrorMessage(error, "Bordro Excel dosyası indirilemedi."));
    } finally {
      setIsExporting(false);
    }
  }

  function selectPeriod(nextId: string | undefined) {
    if (nextId === undefined) return;
    setSelectedId(nextId);
    setActionMessage(null);
    setActionError(null);
  }

  /**
   * 🔴 K3 — dönem HİÇ YOKSA açıklayıcı boş durum; "dönem aç" DÜĞMESİ ÇİZİLMEZ
   * (`POST /payroll/periods` ucu var ama formunun mockup'ı yok).
   */
  const hasNoPeriods = periodsQuery.data !== undefined && rows.length === 0;

  // 🔴 "Yüklendi" nöbetçisi TÜM bağımsız veri kaynakları çözüldüğünde basılır:
  // dönem listesi + (dönem varsa) detay. Erken basılırsa görsel spec
  // "Yükleniyor…" karesini baseline'a gömerdi.
  const isLoaded = periodsQuery.data !== undefined && (hasNoPeriods || detail !== undefined);

  return (
    <div className="bor">
      {/* BY:46 */}
      <p className="bor__eyebrow">{BREADCRUMB}</p>

      <div className="bor__head">
        {/* BY:48 */}
        <h1 className="bor__title">{PAGE_TITLE}</h1>
        <div className="bor__actions">
          {/* BY:50-54 — `‹ Temmuz 2026 ›`. `‹`/`›` glif kapsamındadır (K5). */}
          <div className="bor-stepper" data-testid="bordro-stepper">
            <Button
              variant="ghost"
              size="sm"
              className="bor-stepper__arrow"
              aria-label={PREV_PERIOD_LABEL}
              disabled={navigation.previousId === undefined}
              onClick={() => selectPeriod(navigation.previousId)}
              data-testid="bordro-prev"
            >
              ‹
            </Button>
            <span className="bor-stepper__label" data-testid="bordro-period-label">
              {navigation.current === undefined
                ? EMPTY_TITLE
                : formatPeriod(navigation.current.year, navigation.current.month)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="bor-stepper__arrow"
              aria-label={NEXT_PERIOD_LABEL}
              disabled={navigation.nextId === undefined}
              onClick={() => selectPeriod(navigation.nextId)}
              data-testid="bordro-next"
            >
              ›
            </Button>
          </div>

          {/* BY:55 — GERÇEK uç: `GET /payroll/periods/{id}/export` (XLSX). */}
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={periodId === undefined || isExporting}
            data-testid="bordro-export"
          >
            {EXPORT_LABEL}
          </Button>

          {/* 🔴 BY:56 — `/pay` ucu (gerekçe `usePayrollMutations.ts`te). */}
          <Button
            variant="success"
            onClick={handlePay}
            disabled={!payEnabled(detail, permission.canWrite) || isPayPending}
            data-testid="bordro-pay"
          >
            {PAY_LABEL}
          </Button>
        </div>
      </div>

      {exportError !== null && (
        <p className="bor-notice bor-notice--danger" data-testid="bordro-export-error">
          {exportError}
        </p>
      )}

      {truncation.isTruncated && (
        <p className="bor-notice" data-testid="bordro-truncation">
          {listTruncationMessage(truncation)}
        </p>
      )}

      {periodsError !== undefined && (
        <p className="bor-notice bor-notice--danger" data-testid="bordro-periods-error">
          {periodsError}
        </p>
      )}
      {detailError !== undefined && (
        <p className="bor-notice bor-notice--danger" data-testid="bordro-error">
          {detailError}
        </p>
      )}
      {periodsError === undefined &&
        detailError === undefined &&
        !hasNoPeriods &&
        detail === undefined && (
          <p className="bor-notice" data-testid="bordro-loading">
            {LOADING_MESSAGE}
          </p>
        )}

      {hasNoPeriods && (
        <Alert variant="info" title={EMPTY_TITLE} data-testid="bordro-empty">
          {EMPTY_BODY}
        </Alert>
      )}

      {actionMessage !== null && (
        <Alert variant="success" data-testid="bordro-action-result">
          {actionMessage}
        </Alert>
      )}
      {actionError !== null && (
        <p className="bor-notice bor-notice--danger" data-testid="bordro-action-error">
          {actionError}
        </p>
      )}

      {detail !== undefined && (
        <PayrollPeriodBody
          detail={detail}
          activeSource={activeSource}
          onSelectSource={setActiveSource}
          canWrite={permission.canWrite}
          onApproveAll={handleApproveAll}
          isApprovePending={isApprovePending}
        />
      )}

      {isLoaded && <span hidden data-testid="bordro-loaded" />}
    </div>
  );
}

/** BY:56 düğmesinin kapısı: `pay` yalnız `approved` dönemde çalışır (aksi 409). */
function payEnabled(
  detail: PayrollPeriodDetailResponse | undefined,
  canWrite: boolean,
): boolean {
  if (detail === undefined || !canWrite) return false;
  return detail.status === "approved";
}

/** BY:303 düğmesinin kapısı: `approved`/`paid` dönemde ilerletilecek adım yok. */
function approveDisabledReason(
  detail: PayrollPeriodDetailResponse,
  canWrite: boolean,
): string | undefined {
  if (!canWrite) return "Bordro yazma izniniz yok.";
  if (detail.status === "paid") return "Dönem ödendi; onay zinciri tamamlandı.";
  if (detail.status === "approved") {
    return "Dönem zaten onaylı; sıradaki adım ödeme damgasıdır (Ödemeyi Onayla).";
  }
  return undefined;
}

interface PayrollPeriodBodyProps {
  detail: PayrollPeriodDetailResponse;
  activeSource: WorkerSource | null;
  onSelectSource: (source: WorkerSource | null) => void;
  canWrite: boolean;
  onApproveAll: () => void;
  isApprovePending: boolean;
}

/**
 * Veri geldikten sonraki gövde. Ayrı bileşen olması, yükleme/hata dallarında
 * `detail`in `undefined` olabileceğini TİPİN söylemesini sağlar
 * (`CashFlowStatementBody` kanonu).
 */
function PayrollPeriodBody({
  detail,
  activeSource,
  onSelectSource,
  canWrite,
  onApproveAll,
  isApprovePending,
}: PayrollPeriodBodyProps) {
  const summary = detail.summary;
  const ordered = orderedSections(detail.sections);
  const shown = visibleSections(detail.sections, activeSource);
  const approveReason = approveDisabledReason(detail, canWrite);

  return (
    <>
      {/* BY:61-64 — dönem durumu + ödeme vadesi. Mockup yalnız "onay bekliyor"
          hâlini çiziyor; dört durumun HEPSİ etiketlenir (K3). */}
      <div className="bor-banner" data-testid="bordro-banner">
        <Badge variant={PERIOD_STATUS_VARIANTS[detail.status]} data-testid="bordro-status">
          {PERIOD_STATUS_LABELS[detail.status]}
        </Badge>
        <span className="bor-banner__text">
          {formatPeriod(detail.year, detail.month)} bordrosu ·{" "}
          {detail.payment_due_date === null
            ? DUE_DATE_MISSING
            : `${DUE_DATE_PREFIX} ${formatDateLong(detail.payment_due_date)}`}
        </span>
      </div>

      {/* 🔴 K3 — fail-closed sayaçlar. Sıfırdan büyük her sayaç GÖRÜNÜR bir
          bant yakar; kullanıcı kartlardaki tutarları TAM sanmamalıdır. */}
      {summary.uncomputed_count > 0 && (
        <Alert variant="warning" title={UNCOMPUTED_BAND_TITLE} data-testid="bordro-uncomputed-band">
          {summary.uncomputed_count} satırın brüt/net tutarı hesaplanamadı; bu satırlar
          kartlardaki toplamlara GİRMEZ ve onaylanamaz.
        </Alert>
      )}
      {/* 🔴 Bu ekranın sayacı `unknown_cost_count`tur — `unknown_rate_count`
          dönem detayında YOKTUR (o SGK özetinin alanıdır). */}
      {summary.unknown_cost_count > 0 && (
        <Alert
          variant="warning"
          title={UNKNOWN_COST_BAND_TITLE}
          data-testid="bordro-unknown-cost-band"
        >
          {summary.unknown_cost_count} personelin ücret verisi tanımlı değil; işveren
          maliyeti bu satırlar OLMADAN hesaplandı.
        </Alert>
      )}
      {summary.excluded_count > 0 && (
        <Alert variant="info" title={EXCLUDED_BAND_TITLE} data-testid="bordro-excluded-band">
          {summary.excluded_count} satır ödemeye girmiyor. {EXCLUDED_BAND_BODY}
        </Alert>
      )}

      {/* BY:67-93 */}
      <PayrollKpiStrip summary={summary} />

      {/* BY:97-103 — tip sekmeleri. Sayılar bölümlerin `line_count`undan gelir.
          🔴 `general` sekmesi YALNIZ sunucu böyle bir bölüm döndürdüğünde
          görünür; mockup dört sekme çiziyor ama enum BEŞ üyeli. */}
      <div className="bor-tabs" role="tablist" data-testid="bordro-tabs">
        <TabButton
          isActive={activeSource === null}
          label={`${ALL_TAB_LABEL} (${totalLineCount(detail.sections)})`}
          onClick={() => onSelectSource(null)}
          testId="bordro-tab-all"
        />
        {SOURCE_ORDER.filter((source) =>
          ordered.some((section) => section.personnel_source === source),
        ).map((source) => {
          const section = ordered.find((item) => item.personnel_source === source);
          return (
            <TabButton
              key={source}
              isActive={activeSource === source}
              label={`${SOURCE_TAB_LABELS[source]} (${section?.line_count ?? 0})`}
              onClick={() => onSelectSource(source)}
              testId={`bordro-tab-${source}`}
            />
          );
        })}
      </div>

      {/* BY:106-307 */}
      <PayrollTable
        sections={shown}
        summary={summary}
        canWrite={canWrite}
        onApproveAll={onApproveAll}
        isApprovePending={isApprovePending}
        isApproveDisabled={approveReason !== undefined}
        approveDisabledReason={approveReason}
      />

      {/* BY:311-330 */}
      <PayrollPaymentSummary summary={summary} />
    </>
  );
}

function TabButton({
  isActive,
  label,
  onClick,
  testId,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      role="tab"
      aria-selected={isActive}
      className={`bor-tab${isActive ? " bor-tab--active" : ""}`}
      onClick={onClick}
      data-testid={testId}
    >
      {label}
    </Button>
  );
}
