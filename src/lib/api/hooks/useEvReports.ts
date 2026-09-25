import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { downloadExport, withQuery } from "@/lib/api/download";
import { unwrap } from "@/lib/api/unwrap";
import type { EvApprovalResult, EvContractorType, EvDailyReport, EvPanelReport, EvQurrReport } from "@/lib/api/models";

import { invalidateDayLockQueries } from "./ev-day-lock-invalidation";

// PLN-F3.1 · Raporlar (Panel / Günlük İlerleme Raporu / Haftalık QURR) —
// backend B3 `earned_value` rapor uçları (F3-SOZLESME.md §2). Planlama
// tarafıdır: çekirdek ekranı bu dosyayı import ETMEZ (spec §2.7).

/** Rapor sorgu anahtarlarının TEK kaynağı. */
export const EV_REPORT_KEYS = {
  /** `GET /panel` — `[panel, siteId, date, range, disciplineId, contractorType]`. */
  panel: "ev-report-panel",
  /** `GET /reports/daily` — `[daily, siteId, date]`. */
  daily: "ev-report-daily",
  /** `GET /reports/weekly` — `[weekly, siteId, week ?? "current"]`. */
  weekly: "ev-report-weekly",
} as const;

export type PanelRange = "4w" | "3m" | "all";
/** Şema kayıtlı değeri (`ContractorType`) — `"own" | "subcon"`dur. */
export type ContractorFilter = EvContractorType;

export interface PanelQuery {
  date: string;
  range?: PanelRange;
  disciplineId?: string | null;
  contractorType?: ContractorFilter | null;
}

/**
 * `GET /sites/{id}/earned-value/panel` — Planlama paneli. Süzgeçler (disiplin
 * kökü, kendi/taşeron) BÜTÜN panele uygulanır (mockup+backend docstring).
 * Boş `siteId` ya da boş `date` → ağa ÇIKMAZ.
 */
export function usePanel(siteId: string, q: PanelQuery): UseQueryResult<EvPanelReport, Error> {
  return useQuery({
    enabled: siteId.length > 0 && q.date.length > 0,
    queryKey: [EV_REPORT_KEYS.panel, siteId, q.date, q.range ?? null, q.disciplineId ?? null, q.contractorType ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/panel", {
          params: {
            path: { site_id: siteId },
            query: {
              date: q.date,
              range: q.range,
              discipline_id: q.disciplineId ?? undefined,
              contractor_type: q.contractorType ?? undefined,
            },
          },
        }),
      ),
  });
}

/**
 * `GET /sites/{id}/earned-value/reports/daily` — Günlük İlerleme Raporu
 * (GİR). Onaylı + kilitli gün → dondurulmuş snapshot (B3-5). Boş `siteId`
 * ya da boş `date` → ağa ÇIKMAZ.
 */
export function useDailyReport(siteId: string, date: string): UseQueryResult<EvDailyReport, Error> {
  return useQuery({
    enabled: siteId.length > 0 && date.length > 0,
    queryKey: [EV_REPORT_KEYS.daily, siteId, date],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/reports/daily", {
          params: { path: { site_id: siteId }, query: { date } },
        }),
      ),
  });
}

/**
 * `POST /sites/{id}/earned-value/reports/daily/{day}/approve` — Onayla ve
 * kilitle (B3-1). ONAY `useUnlockDay`in TERSİDİR: aynı gün kilidini değiştirir,
 * bu yüzden AYNI tazeleme kümesini paylaşır (`invalidateDayLockQueries` —
 * PLN-F3.1-ek: bu pay ayrılmadan önce onaydan sonra günlük kayıt + aylık
 * puantaj YANLIŞLIKLA kilitsiz görünüyordu). Ayrıca GİR'in kendisi + Panel +
 * QURR tazelenir — bu üç uç onaylı günün kendi verisini taşır.
 */
export function useApproveDailyReport(
  siteId: string,
): UseMutationResult<EvApprovalResult, Error, { day: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ day }) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/earned-value/reports/daily/{day}/approve", {
          params: { path: { site_id: siteId, day } },
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [EV_REPORT_KEYS.daily, siteId] });
      void client.invalidateQueries({ queryKey: [EV_REPORT_KEYS.panel, siteId] });
      void client.invalidateQueries({ queryKey: [EV_REPORT_KEYS.weekly, siteId] });
      invalidateDayLockQueries(client, siteId);
    },
  });
}

/**
 * `GET /sites/{id}/earned-value/reports/weekly` — Haftalık QURR (B3-2:
 * onaylanmaz, canlı). `week === null` → sorgu `week` PARAMETRESİ OLMADAN
 * gider (backend bugünün haftasını döner). Baseline yok → 409, hafta
 * takvimde yok → 404 (bkz. `report-errors.ts`). Boş `siteId` → ağa ÇIKMAZ.
 */
export function useWeeklyReport(siteId: string, week: number | null): UseQueryResult<EvQurrReport, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [EV_REPORT_KEYS.weekly, siteId, week ?? "current"],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/reports/weekly", {
          params: { path: { site_id: siteId }, query: week === null ? {} : { week } },
        }),
      ),
  });
}

const WEEKLY_XLSX_FALLBACK_PREFIX = "QURR-H";

function weeklyXlsxPath(siteId: string, week: number): string {
  return withQuery(`/api/backend/sites/${encodeURIComponent(siteId)}/earned-value/reports/weekly.xlsx`, {
    week: String(week),
  });
}

/**
 * QURR Excel'i indirir (`downloadExport` — ikili gövde TEK kaynağı). Süzgeç
 * almaz: haftanın TAMAMI iner (ekranla aynı hesap, `report-errors.ts`
 * dokümantasyonundaki gibi export saf sunumdur).
 */
export async function downloadWeeklyXlsx(siteId: string, week: number): Promise<void> {
  await downloadExport(weeklyXlsxPath(siteId, week), `${WEEKLY_XLSX_FALLBACK_PREFIX}${week}.xlsx`);
}
