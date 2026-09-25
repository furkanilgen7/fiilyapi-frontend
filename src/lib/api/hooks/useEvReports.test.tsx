import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EV_DAY_KEYS } from "./useEvDay";
import {
  EV_REPORT_KEYS,
  downloadWeeklyXlsx,
  useApproveDailyReport,
  useDailyReport,
  usePanel,
  useWeeklyReport,
} from "./useEvReports";
import { SITE_DIARY_ENTRIES_QUERY_KEY, SITE_DIARY_ENTRY_QUERY_KEY } from "./useSiteDiary";
import { TIMESHEET_QUERY_KEY, TIMESHEET_WEEK_QUERY_KEY } from "./useTimesheet";
import { backendClient } from "@/lib/api/client";
import { downloadExport } from "@/lib/api/download";
import { BackendError } from "@/lib/api/unwrap";

// PLN-F3.1 · Rapor okuma/yazma hook'ları (B3 uçları; `useEvDay.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

vi.mock("@/lib/api/download", () => ({
  downloadExport: vi.fn(),
  withQuery: (path: string, query: Record<string, string>) => {
    const qs = new URLSearchParams(query).toString();
    return qs ? `${path}?${qs}` : path;
  },
}));

const SITE = "site-1";
const DATE = "2026-09-24";

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function fail(status: number, detail = "x") {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("EV_REPORT_KEYS — sorgu anahtarları tek sabitte", () => {
  it("üç kök birbirinden ve saha/bütçe köklerinden ayrıdır", () => {
    const roots = Object.values(EV_REPORT_KEYS);
    expect(new Set(roots).size).toBe(roots.length);
    expect(roots).not.toContain(EV_DAY_KEYS.day);
  });
});

describe("usePanel", () => {
  it("GET /panel; sorgu parametreleri ADI backend'in beklediği gibi (snake_case)", async () => {
    const report = { day: DATE, range: "4w" };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(report));
    const { result } = renderHook(
      () => usePanel(SITE, { date: DATE, range: "4w", disciplineId: "d:1", contractorType: "own" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/panel", {
      params: {
        path: { site_id: SITE },
        query: { date: DATE, range: "4w", discipline_id: "d:1", contractor_type: "own" },
      },
    });
    expect(client.getQueryData([EV_REPORT_KEYS.panel, SITE, DATE, "4w", "d:1", "own"])).toEqual(report);
  });

  it("boş şantiye ya da boş tarih ile ağa çıkmaz", () => {
    renderHook(() => usePanel("", { date: DATE }), { wrapper });
    renderHook(() => usePanel(SITE, { date: "" }), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("useDailyReport", () => {
  it("GET /reports/daily?date=; yanıt [daily, site, tarih] anahtarında", async () => {
    const report = { report_date: DATE, status: "draft" };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(report));
    const { result } = renderHook(() => useDailyReport(SITE, DATE), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/reports/daily", {
      params: { path: { site_id: SITE }, query: { date: DATE } },
    });
    expect(client.getQueryData([EV_REPORT_KEYS.daily, SITE, DATE])).toEqual(report);
  });

  it("boş şantiye ya da boş tarih ile ağa çıkmaz", () => {
    renderHook(() => useDailyReport("", DATE), { wrapper });
    renderHook(() => useDailyReport(SITE, ""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("useApproveDailyReport", () => {
  it("POST /reports/daily/{day}/approve; başarıda GİR+Panel+QURR+Saha gün+puantaj(hafta+aylık)+günlük kayıt(liste+tekil) tazelenir — onay unlock'un TERSİDİR", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ missing_diary_dates: [], report: {} }));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useApproveDailyReport(SITE), { wrapper });
    await act(() => result.current.mutateAsync({ day: DATE }));
    expect(backendClient.POST).toHaveBeenCalledWith(
      "/sites/{site_id}/earned-value/reports/daily/{day}/approve",
      { params: { path: { site_id: SITE, day: DATE } } },
    );
    const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        [EV_REPORT_KEYS.daily, SITE],
        [EV_REPORT_KEYS.panel, SITE],
        [EV_REPORT_KEYS.weekly, SITE],
        [EV_DAY_KEYS.day, SITE],
        [SITE_DIARY_ENTRIES_QUERY_KEY, SITE],
        [SITE_DIARY_ENTRY_QUERY_KEY],
        [TIMESHEET_WEEK_QUERY_KEY, SITE],
        [TIMESHEET_QUERY_KEY, SITE],
      ]),
    );
  });

  it("422 (taslak günlük var — K13) BackendError fırlar, hiçbir şey tazelenmez", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(fail(422, "Taslak günlük kayıt var"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useApproveDailyReport(SITE), { wrapper });
    await expect(result.current.mutateAsync({ day: DATE })).rejects.toBeInstanceOf(BackendError);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("useWeeklyReport", () => {
  it("week verilirse sorguya GİRER; anahtar [weekly, site, week]", async () => {
    const report = { week_no: 12 };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(report));
    const { result } = renderHook(() => useWeeklyReport(SITE, 12), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/reports/weekly", {
      params: { path: { site_id: SITE }, query: { week: 12 } },
    });
    expect(client.getQueryData([EV_REPORT_KEYS.weekly, SITE, 12])).toEqual(report);
  });

  it("week === null → sorgu week'SİZ gider; anahtar [weekly, site, \"current\"]", async () => {
    const report = { week_no: 39 };
    vi.mocked(backendClient.GET).mockResolvedValue(ok(report));
    const { result } = renderHook(() => useWeeklyReport(SITE, null), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/reports/weekly", {
      params: { path: { site_id: SITE }, query: {} },
    });
    expect(client.getQueryData([EV_REPORT_KEYS.weekly, SITE, "current"])).toEqual(report);
  });

  it("409 (baseline yok) BackendError olarak yüzer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(fail(409, "Şantiyede aktif (dondurulmuş) baseline yok"));
    const { result } = renderHook(() => useWeeklyReport(SITE, null), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(409);
  });

  it("boş şantiye ile ağa çıkmaz", () => {
    renderHook(() => useWeeklyReport("", 12), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });
});

describe("downloadWeeklyXlsx", () => {
  it("downloadExport ile BFF yoluna ?week= ekleyerek çağırır; varsayılan ad QURR-H{n}.xlsx", async () => {
    await downloadWeeklyXlsx(SITE, 12);
    expect(downloadExport).toHaveBeenCalledWith(
      `/api/backend/sites/${SITE}/earned-value/reports/weekly.xlsx?week=12`,
      "QURR-H12.xlsx",
    );
  });
});
