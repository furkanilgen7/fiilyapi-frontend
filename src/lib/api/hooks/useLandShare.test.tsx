import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  LAND_SHARE_SUMMARY_QUERY_KEY,
  LAND_SHARE_UNITS_QUERY_KEY,
  isLandShareMissing,
  useLandShareSummary,
  useLandShareUnits,
  useUpdateAllocation,
} from "./useLandShare";
import { PROJECT_BLOCKS_QUERY_KEY } from "./useProjectBlocks";
import { PROJECT_UNITS_QUERY_KEY } from "./useProjectUnits";
import { SALES_SUMMARY_QUERY_KEY } from "./useSalesSummary";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-UNIT2 T2c · PG'nin üç ucu (`useStockMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string | null = null) {
  return {
    data: undefined,
    error: detail === null ? undefined : { detail },
    response: new Response(null, { status }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useLandShareSummary", () => {
  it("GET /projects/{id}/land-share/summary çağırır", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ project_id: "prj-1" }));

    const { result } = renderHook(() => useLandShareSummary("prj-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith(
      "/projects/{project_id}/land-share/summary",
      { params: { path: { project_id: "prj-1" } } },
    );
  });

  it("boş proje kimliğiyle AĞA ÇIKILMAZ", () => {
    renderHook(() => useLandShareSummary(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("🔴 404 AYIRT EDİLEBİLİR bir hâldir — 'kat karşılığı yok' demektir", async () => {
    // Şema: *"Kat karsiligi OLMAYAN proje (kayit yok) burada 404 alir, BOS OZET
    // DEGIL"*. Ekran o 404'ü boş özet gibi basarsa "%0/%0 paylaşım" yazar.
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(404));

    const { result } = renderHook(() => useLandShareSummary("prj-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isLandShareMissing(result.current.error)).toBe(true);
    expect(isLandShareMissing(new BackendError(403, null))).toBe(false);
    expect(isLandShareMissing(new Error("ağ"))).toBe(false);
  });
});

describe("useLandShareUnits — SAYFALI liste", () => {
  it("varsayılan sayfa boyutu SUNUCUNUNKİYLE aynıdır ve süzgeç anahtarları KURULMAZ", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ items: [], total: 0 }));

    const { result } = renderHook(() => useLandShareUnits("prj-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    const query = options.params.query;
    expect(query).toEqual({ limit: 50, offset: 0 });
    // 🔴 "Tümü" düğmesi `owner_side`ı HİÇ göndermemektir — `undefined` bile değil.
    expect(Object.keys(query)).not.toContain("owner_side");
  });

  it("süzgeçler sorguya geçer (`owner_side` · `block_id` · `offset`)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse({ items: [], total: 0 }));

    const { result } = renderHook(
      () =>
        useLandShareUnits("prj-1", { ownerSide: "unassigned", blockId: "blk-a", offset: 50 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: unknown };
    };
    expect(options.params.query).toEqual({
      owner_side: "unassigned",
      block_id: "blk-a",
      limit: 50,
      offset: 0 + 50,
    });
  });
});

describe("useUpdateAllocation", () => {
  const BODY = { items: [{ unit_id: "u-1", owner_side: null, shareholder_id: null }] };

  it("🔴 **PATCH** çağırır — POST/PUT DEĞİL", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ blocks: [] }));

    const { result } = renderHook(() => useUpdateAllocation(), { wrapper });
    result.current.mutate({ projectId: "prj-1", body: BODY });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith(
      "/projects/{project_id}/units/allocation",
      { params: { path: { project_id: "prj-1" } }, body: BODY },
    );
    expect(backendClient.POST).not.toHaveBeenCalled();
    expect(backendClient.PUT).not.toHaveBeenCalled();
  });

  it("🔴 ÖZET yeniden çekilir, LİSTE ise YALNIZ bayat işaretlenir (ikinci GET yok)", async () => {
    // Yanıt *"guncel tam listedir"* ve ekran tabloyu ondan çizer; aktif liste
    // sorgusunu yeniden çektirmek elimizde cevabı varken atılan İKİNCİ bir GET
    // olurdu. Özet ise ÇEKİLMELİDİR: denge sayıları yanıtta YOKTUR.
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ blocks: [] }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAllocation(), { wrapper });
    result.current.mutate({ projectId: "prj-1", body: BODY });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [LAND_SHARE_SUMMARY_QUERY_KEY] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [LAND_SHARE_UNITS_QUERY_KEY],
      refetchType: "none",
    });
  });

  it("`units` modülünün ÜÇ türevi de geçersiz kılınır (kopya küme yok)", async () => {
    // 42 ünitenin sahipliği değişince blok kartları, ünite ızgarası ve satış
    // KPI özeti BAŞKA ekranlarda bayattır; küme `useUnitMutations`tan gelir.
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ blocks: [] }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAllocation(), { wrapper });
    result.current.mutate({ projectId: "prj-1", body: BODY });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const key of [
      PROJECT_BLOCKS_QUERY_KEY,
      PROJECT_UNITS_QUERY_KEY,
      SALES_SUMMARY_QUERY_KEY,
    ]) {
      expect(invalidate, key).toHaveBeenCalledWith({ queryKey: [key] });
    }
  });

  it("🔴 ATOMİK RED: 404 çağırana AYNEN iletilir, başarı taklidi YAPILMAZ", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(errorResponse(404, "Kayıt bulunamadı"));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAllocation(), { wrapper });
    result.current.mutate({ projectId: "prj-1", body: BODY });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(404);
    // Hiçbir şey yazılmadıysa hiçbir önbellek de bayatlamamıştır.
    expect(invalidate).not.toHaveBeenCalled();
  });
});
