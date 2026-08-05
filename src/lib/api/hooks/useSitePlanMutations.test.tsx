import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useSaveSitePlanCells,
  useSaveSitePlanGoals,
  useSaveSitePlanRows,
  useSaveSitePlanSprint,
} from "./useSitePlanMutations";
import { SITE_PLAN_QUERY_KEY } from "./useSitePlan";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PL T1 · dort DEGISTIRME ucu (`useSiteDiaryMutations.test.tsx` deseni):
// cagri sozlesmesi (ozellikle `week_start` sorgu parametresinin VARLIGI/YOKLUGU)
// + gecersiz kilma + hata dali.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE_ID = "s-1";
const WEEK_START = "2026-08-03";

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

function expectSiteInvalidation() {
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [SITE_PLAN_QUERY_KEY, SITE_ID] });
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
});

describe("useSaveSitePlanRows", () => {
  it("PUT …/plan/rows cagirir; uc SANTIYE kapsamlidir, week_start GONDERILMEZ", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));

    const { result } = renderHook(() => useSaveSitePlanRows(SITE_ID), { wrapper });
    act(() =>
      result.current.mutate({
        rows: [{ kind: "crew", section_id: "sec-1", label: "Kalıpçı", sort_order: 0 }],
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/plan/rows", {
      params: { path: { site_id: SITE_ID } },
      body: { rows: [{ kind: "crew", section_id: "sec-1", label: "Kalıpçı", sort_order: 0 }] },
    });
    expectSiteInvalidation();
  });

  it("bos satir listesi de gonderilebilir (TUM satirlari siler)", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ rows: [] }));

    const { result } = renderHook(() => useSaveSitePlanRows(SITE_ID), { wrapper });
    act(() => result.current.mutate({ rows: [] }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/plan/rows", {
      params: { path: { site_id: SITE_ID } },
      body: { rows: [] },
    });
  });

  it("403'te BackendError firlatir ve gecersiz kilma YAPILMAZ", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useSaveSitePlanRows(SITE_ID), { wrapper });
    act(() => result.current.mutate({ rows: [] }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useSaveSitePlanCells", () => {
  it("PUT …/plan/cells cagirir; kapsam week_start HAFTASIDIR", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ site_id: SITE_ID }));

    const { result } = renderHook(() => useSaveSitePlanCells(SITE_ID, WEEK_START), { wrapper });
    act(() =>
      result.current.mutate({
        cells: [{ row_id: "r-1", plan_date: WEEK_START, text: "Kalıp sökümü", tag: "blue" }],
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/plan/cells", {
      params: { path: { site_id: SITE_ID }, query: { week_start: WEEK_START } },
      body: {
        cells: [{ row_id: "r-1", plan_date: WEEK_START, text: "Kalıp sökümü", tag: "blue" }],
      },
    });
    expectSiteInvalidation();
  });

  it("422'de BackendError firlatir (hucre baska haftaya tasiyor)", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(errorResponse(422, "hafta disi"));

    const { result } = renderHook(() => useSaveSitePlanCells(SITE_ID, WEEK_START), { wrapper });
    act(() => result.current.mutate({ cells: [] }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(422);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useSaveSitePlanGoals", () => {
  it("PUT …/plan/goals cagirir; kapsam week_start HAFTASIDIR", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ site_id: SITE_ID }));

    const { result } = renderHook(() => useSaveSitePlanGoals(SITE_ID, WEEK_START), { wrapper });
    act(() =>
      result.current.mutate({
        goals: [{ title: "Kalıp tamam", is_done: false, status: "in_progress", sort_order: 0 }],
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/plan/goals", {
      params: { path: { site_id: SITE_ID }, query: { week_start: WEEK_START } },
      body: {
        goals: [{ title: "Kalıp tamam", is_done: false, status: "in_progress", sort_order: 0 }],
      },
    });
    expectSiteInvalidation();
  });
});

describe("useSaveSitePlanSprint", () => {
  it("PUT …/plan/sprint cagirir; SANTIYE kapsamli, week_start GONDERILMEZ", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse({ id: "sp-1", name: "Sprint 12" }));

    const { result } = renderHook(() => useSaveSitePlanSprint(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: "Sprint 12" }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PUT).toHaveBeenCalledWith("/sites/{site_id}/plan/sprint", {
      params: { path: { site_id: SITE_ID } },
      body: { name: "Sprint 12" },
    });
    expectSiteInvalidation();
  });

  it("bos ad aktif sprinti kapatir ve yanit null gelir", async () => {
    vi.mocked(backendClient.PUT).mockResolvedValue(okResponse(null));

    const { result } = renderHook(() => useSaveSitePlanSprint(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expectSiteInvalidation();
  });
});
