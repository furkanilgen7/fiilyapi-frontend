import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useTimesheet, TIMESHEET_QUERY_KEY } from "./useTimesheet";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PT T1 · puantaj matrisi okuma hook'u (`useSitePlan.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE_ID = "s-1";
const PERIOD = { year: 2026, month: 8 };
const MATRIX = {
  site_id: SITE_ID,
  site_name: "A-Blok Şantiyesi",
  project_id: "p-1",
  project_name: "Güneşkent Konutları",
  year: 2026,
  month: 8,
  section_id: null,
  section_name: null,
  worker_count: 1,
  total_man_days: 2,
  total_overtime_hours: "3.00",
  rows: [
    {
      personnel_id: "per-1",
      full_name: "Mehmet Kılıç",
      trade: "Kalıpçı",
      source: "company",
      subcontractor_name: null,
      man_days: 2,
      // SEYREK: yalniz girilen gunler hucre uretir.
      cells: [
        { work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-04", code: "overtime", overtime_hours: "3.00", section_id: "sec-1" },
      ],
    },
  ],
  day_totals: [
    { work_date: "2026-08-03", worked_count: 1, has_overtime: false, temporary_duty_count: 0 },
    { work_date: "2026-08-04", worked_count: 1, has_overtime: true, temporary_duty_count: 0 },
  ],
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useTimesheet", () => {
  it("GET …/timesheet cagirir; year/month ZORUNLU sorgu parametreleridir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(MATRIX));

    // Act
    const { result } = renderHook(() => useTimesheet(SITE_ID, PERIOD), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/timesheet", {
      params: { path: { site_id: SITE_ID }, query: { year: 2026, month: 8 } },
    });
    expect(client.getQueryData([TIMESHEET_QUERY_KEY, SITE_ID, 2026, 8, null])).toEqual(MATRIX);
  });

  it("sectionId verilince section_id sorguya eklenir ve anahtar AYRISIR", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ ...MATRIX, section_id: "sec-1" }));

    // Act
    const { result } = renderHook(() => useTimesheet(SITE_ID, PERIOD, "sec-1"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/timesheet", {
      params: {
        path: { site_id: SITE_ID },
        query: { year: 2026, month: 8, section_id: "sec-1" },
      },
    });
    expect(client.getQueryData([TIMESHEET_QUERY_KEY, SITE_ID, 2026, 8, "sec-1"])).toBeDefined();
    expect(client.getQueryData([TIMESHEET_QUERY_KEY, SITE_ID, 2026, 8, null])).toBeUndefined();
  });

  it("bos siteId ile aga CIKMAZ", async () => {
    // Act
    const { result } = renderHook(() => useTimesheet("", PERIOD), { wrapper });

    // Assert
    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("hucreler SEYREKTIR — girilmemis gun hucre URETMEZ, gun iskeleti day_totals'tedir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(MATRIX));

    // Act
    const { result } = renderHook(() => useTimesheet(SITE_ID, PERIOD), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.rows[0].cells).toHaveLength(2);
    expect(result.current.data?.day_totals).toHaveLength(2);
  });

  it("404'te BackendError firlatir (baska santiyenin bolumu bos matris DEGIL 404'tur)", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(404, "bolum yok"));

    // Act
    const { result } = renderHook(() => useTimesheet(SITE_ID, PERIOD, "sec-yabanci"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(404);
  });
});
