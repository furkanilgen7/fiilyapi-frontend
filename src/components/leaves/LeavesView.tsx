"use client";

import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { PersonnelTabsStrip } from "@/components/personnel/PersonnelTabsStrip";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useHrLeavesSummary, usePendingLeaveRequests } from "@/lib/api/hooks/useLeaves";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { LEAVES_EYEBROW, LEAVES_PAGE_TITLE, REQUESTS_ERROR_PREFIX, SUMMARY_ERROR_PREFIX } from "./leaves-labels";
import { LeaveBalancesTable } from "./LeaveBalancesTable";
import { LeavesKpiStrip } from "./LeavesKpiStrip";
import {
  PendingLeaveRequestsTable,
  type LeaveDecisionHandlers,
} from "./PendingLeaveRequestsTable";
import "./leaves.css";

/**
 * F-IZN T3 · İZ — `/personel/izinler` (İzin Yönetimi) ekranı; kanon
 * `İK - İzin Yönetimi.dc.html` (parantez içi sayılar o dosyanın SATIR
 * numaralarıdır).
 *
 * ⚠️ Kabuk canon'u: mockup'ın KENDİ üst barı (14-22) ve KENDİ sol menüsü
 * (25-40) BASILMAZ — kabuk uygulamadan gelir (HrDocumentsView emsali). ANA
 * SIDEBAR'A ÖĞE EKLENMEZ; bu ekrana erişim `/personel` sekme şeridindendir.
 * Breadcrumb (19) kabuktan gelir.
 *
 * ⚠️ İKİ uç okunur ve ikisi de gereklidir: özet (KPI + bakiye tablosu) ve
 * `status=pending` talep listesi. Bakiye dizisi AYNI ZAMANDA talep tablosunun
 * "Kalan Hak" sütununun kaynağıdır (K4 istemci JOIN'i).
 *
 * ⚠️ İzin modülü `personnel`dır: izin kayıtları personelin alt kaynağıdır.
 */
const YEAR_OPTION_COUNT = 2;

function buildYearOptions(currentYear: number): number[] {
  // 120 — mockup iki yıl listeler (2026/2025): içinde bulunulan yıl + bir önceki.
  return Array.from({ length: YEAR_OPTION_COUNT }, (_, index) => currentYear - index);
}

export interface LeavesViewProps extends LeaveDecisionHandlers {
  /** Testler ve T4 için sabitlenebilir "bugün"ün yılı. */
  currentYear?: number;
}

export function LeavesView({
  currentYear = new Date().getFullYear(),
  onApproveRequest,
  onRejectRequest,
}: LeavesViewProps = {}) {
  const permission = useModulePermission("personnel");
  const [year, setYear] = useState(currentYear);
  const summaryQuery = useHrLeavesSummary(year);
  const requestsQuery = usePendingLeaveRequests();

  if (
    !permission.canView ||
    isForbidden(summaryQuery.error) ||
    isForbidden(requestsQuery.error)
  ) {
    return <AccessDenied />;
  }

  const summary = summaryQuery.data;
  const summaryError = summaryQuery.isError
    ? `${SUMMARY_ERROR_PREFIX}: ${backendErrorMessage(summaryQuery.error)}`
    : undefined;
  const requestsError = requestsQuery.isError
    ? `${REQUESTS_ERROR_PREFIX}: ${backendErrorMessage(requestsQuery.error)}`
    : undefined;

  return (
    <div className="iz">
      <p className="iz__eyebrow">{LEAVES_EYEBROW}</p>
      <h1 className="iz__title">{LEAVES_PAGE_TITLE}</h1>

      {/* `/personel` ile ORTAK sekme şeridi (F-IZN T5 bu sekmeyi gerçek
          rotasına bağlar; şerit BU dilimde DEĞİŞTİRİLMEZ). */}
      <PersonnelTabsStrip />

      {/* 45-51 */}
      <LeavesKpiStrip summary={summary} />

      {/* 54-113 */}
      <PendingLeaveRequestsTable
        rows={requestsQuery.data?.items}
        total={requestsQuery.data?.total}
        balances={summary?.balances}
        isLoading={requestsQuery.isLoading}
        errorMessage={requestsError}
        onApproveRequest={onApproveRequest}
        onRejectRequest={onRejectRequest}
      />

      {/* 116-171 */}
      <LeaveBalancesTable
        rows={summary?.balances}
        isLoading={summaryQuery.isLoading}
        errorMessage={summaryError}
        year={year}
        yearOptions={buildYearOptions(currentYear)}
        onYearChange={setYear}
      />
    </div>
  );
}
