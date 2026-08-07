import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSaveTimesheet, type TimesheetSave } from "./useTimesheetMutations";
import { TIMESHEET_QUERY_KEY } from "./useTimesheet";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PT T1 · puantaj kaydetme ucu (`useSitePlanMutations.test.tsx` deseni):
// cagri sozlesmesi + KAPSAM KURALI + gecersiz kilma + hata dali.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE_ID = "s-1";
const PERIOD = { year: 2026, month: 8 };

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

let client: QueryClient;
let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

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
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
});

describe("useSaveTimesheet", () => {
  it("PUT …/timesheet cagirir; year/month sorguda, section_id GONDERILMEZ", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));
    const body: TimesheetSave = {
      cells: [
        { personnel_id: "per-1", work_date: "2026-08-03", code: "worked", section_id: "sec-1" },
      ],
    };

    // Act
    const { result } = renderHook(() => useSaveTimesheet(SITE_ID, PERIOD), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(body);
    });

    // Assert
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/timesheet", {
      params: { path: { site_id: SITE_ID }, query: { year: 2026, month: 8 } },
      body,
    });
    const call = vi.mocked(backendClient.PUT).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    expect(call.params.query).not.toHaveProperty("section_id");
  });

  // ⚠️ KAPSAM KURALI (bu dilimin en kritik tuzagi): hook BOLUM ALMAZ. Imzasi
  // filtreli kumeyi kazara gondermeyi kolaylastirmamalidir — govde HER ZAMAN
  // santiyenin TAM hucre kumesidir, gecmeyen hucre backend'de SILINIR.
  it("hook imzasi bolum filtresi ALMAZ — kapsam SANTIYE+DONEM'dir", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));

    // Act
    const { result } = renderHook(() => useSaveTimesheet(SITE_ID, PERIOD), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ cells: [] });
    });

    // Assert — cagriyi bicimlendiren TEK sey santiye + donem.
    expect(useSaveTimesheet.length).toBe(2);
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/timesheet", {
      params: { path: { site_id: SITE_ID }, query: { year: 2026, month: 8 } },
      body: { cells: [] },
    });
  });

  it("govde AYNEN gecirilir — hook hucre eklemez/cikarmaz (DEGISTIRME semantigi)", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));
    const body: TimesheetSave = {
      cells: [
        { personnel_id: "per-1", work_date: "2026-08-03", code: "worked", section_id: "sec-1" },
        {
          personnel_id: "per-2",
          work_date: "2026-08-03",
          code: "overtime",
          overtime_hours: "3.00",
          section_id: "sec-2",
        },
      ],
    };

    // Act
    const { result } = renderHook(() => useSaveTimesheet(SITE_ID, PERIOD), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(body);
    });

    // Assert
    const call = vi.mocked(backendClient.PUT).mock.calls[0][1] as { body: TimesheetSave };
    expect(call.body).toEqual(body);
    expect(call.body.cells).toHaveLength(2);
  });

  it("basarida SANTIYENIN tum donem/bolum varyantlarini gecersiz kilar", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));

    // Act
    const { result } = renderHook(() => useSaveTimesheet(SITE_ID, PERIOD), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ cells: [] });
    });

    // Assert — prefix eslesme (donem/bolum tasimaz).
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [TIMESHEET_QUERY_KEY, SITE_ID] });
  });

  it("409 YUTULMAZ — kisi-gun catismasi BackendError olarak cagirana ulasir", async () => {
    // Arrange
    vi.mocked(backendClient.PUT).mockResolvedValue(
      errorResponse(409, "Bu kişi aynı gün başka şantiyede kayıtlı."),
    );

    // Act
    const { result } = renderHook(() => useSaveTimesheet(SITE_ID, PERIOD), { wrapper });
    const error = await act(async () =>
      result.current.mutateAsync({ cells: [] }).catch((err: unknown) => err),
    );

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(409);
  });
});
