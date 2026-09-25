import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EV_DAY_KEYS } from "./useEvDay";
import { dayAllocationErrorMessage, useSaveDayAllocation, useUnlockDay } from "./useEvDayMutations";
import { SITE_DIARY_ENTRIES_QUERY_KEY, SITE_DIARY_ENTRY_QUERY_KEY } from "./useSiteDiary";
import { TIMESHEET_QUERY_KEY, TIMESHEET_WEEK_QUERY_KEY } from "./useTimesheet";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";
import type { EvAllocationSave } from "@/lib/api/models";

// PLN-F2.1 · Saha yazma hook'ları: gövde BİREBİR, önbellek yazılır/tazelenir.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE = "site-1";
const DAY = "2026-09-24";
const VIEW = { day: DAY, rows: [], codes: [], cells: [], lock: { locked: false } };

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function fail(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSaveDayAllocation", () => {
  const body: EvAllocationSave = {
    codes: [{ node_id: "L3:item-1", rule: "direct" }],
    cells: [{ row: { kind: "personnel", ref_id: "p-1" }, node_id: "L3:item-1", hours: "9" }],
    unallocated_reason: null,
  };

  it("PUT /days/{day}/allocation gövdesi AYNEN (TAM değiştirme — istemci kırpmaz)", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(ok(VIEW));
    const { result } = renderHook(() => useSaveDayAllocation(SITE, DAY), { wrapper });
    await act(() => result.current.mutateAsync(body));
    expect(backendClient.PUT).toHaveBeenCalledWith(
      "/sites/{site_id}/earned-value/days/{day}/allocation",
      { params: { path: { site_id: SITE, day: DAY } }, body },
    );
  });

  it("başarıda yanıt (DayView) gün anahtarına YAZILIR — ikinci GET beklenmez", async () => {
    const saved = { ...VIEW, totals: { source_hours: "9", allocated_hours: "9", unallocated_hours: "0" } };
    vi.mocked(backendClient.PUT).mockResolvedValue(ok(saved));
    const { result } = renderHook(() => useSaveDayAllocation(SITE, DAY), { wrapper });
    await act(() => result.current.mutateAsync(body));
    expect(client.getQueryData([EV_DAY_KEYS.day, SITE, DAY])).toEqual(saved);
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("başarıda önceki-dağılım anahtarları tazelenir (kopya kaynağı değişmiş olabilir)", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(ok(VIEW));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveDayAllocation(SITE, DAY), { wrapper });
    await act(() => result.current.mutateAsync(body));
    const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual([EV_DAY_KEYS.previousAllocation, SITE]);
  });

  it("409 (gün kilitli / baseline yok) BackendError fırlar, önbellek YAZILMAZ, mesaj backend'in Türkçesidir", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(fail(409, "Bu gün onaylı raporla kilitli."));
    const { result } = renderHook(() => useSaveDayAllocation(SITE, DAY), { wrapper });
    const error = await result.current.mutateAsync(body).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(409);
    expect(dayAllocationErrorMessage(error)).toBe("Bu gün onaylı raporla kilitli.");
    expect(client.getQueryData([EV_DAY_KEYS.day, SITE, DAY])).toBeUndefined();
  });

  it("gövdesiz/ağ hatasında sabit Türkçe yedek mesaj", () => {
    expect(dayAllocationErrorMessage(new Error("network"))).toBe("Saat dağıtımı kaydedilemedi.");
  });
});

describe("useUnlockDay", () => {
  it("POST /days/{day}/unlock gerekçe gövdesiyle", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ locked: false }));
    const { result } = renderHook(() => useUnlockDay(SITE, DAY), { wrapper });
    await act(() => result.current.mutateAsync("Miktar düzeltmesi"));
    expect(backendClient.POST).toHaveBeenCalledWith("/sites/{site_id}/earned-value/days/{day}/unlock", {
      params: { path: { site_id: SITE, day: DAY } },
      body: { reason: "Miktar düzeltmesi" },
    });
  });

  it("başarıda gün + günlük + puantaj sorguları tazelenir (kilit üçünü de bağlar)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(ok({ locked: false }));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUnlockDay(SITE, DAY), { wrapper });
    await act(() => result.current.mutateAsync("Miktar düzeltmesi"));
    const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        [EV_DAY_KEYS.day, SITE, DAY],
        [SITE_DIARY_ENTRIES_QUERY_KEY, SITE],
        [SITE_DIARY_ENTRY_QUERY_KEY],
        [TIMESHEET_WEEK_QUERY_KEY, SITE],
        [TIMESHEET_QUERY_KEY, SITE],
      ]),
    );
  });

  it("403 (onay yetkisi yok) BackendError fırlar, hiçbir şey tazelenmez", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(fail(403, "Yetki yok"));
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUnlockDay(SITE, DAY), { wrapper });
    await expect(result.current.mutateAsync("Miktar düzeltmesi")).rejects.toBeInstanceOf(BackendError);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
