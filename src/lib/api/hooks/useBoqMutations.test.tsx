import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateBoqGroup, useCreateBoqItem, useUpdateBoqItem } from "./useBoqMutations";
import { BOQ_QUERY_KEY } from "./useBoq";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  backendClient: { POST: vi.fn(), PATCH: vi.fn() },
}));

const SITE_ID = "s-1";

let client: QueryClient;
let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
});

describe("useCreateBoqGroup", () => {
  it("başarıda ['boq', siteId] anahtarını geçersiz kılar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      okResponse({ id: "g-1", name: "KABA YAPI", sort_order: 10, items: [], group_total: "0.00" }),
    );

    const { result } = renderHook(() => useCreateBoqGroup(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: "KABA YAPI", sort_order: 10 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/sites/{site_id}/boq/groups", {
      params: { path: { site_id: SITE_ID } },
      body: { name: "KABA YAPI", sort_order: 10 },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [BOQ_QUERY_KEY, SITE_ID] });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("hata durumunda hiçbir sorgu geçersiz kılınmaz", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue({
      data: undefined,
      error: { detail: "patladı" },
      response: new Response(null, { status: 500 }),
    } as never);

    const { result } = renderHook(() => useCreateBoqGroup(SITE_ID), { wrapper });
    act(() => result.current.mutate({ name: "KABA YAPI", sort_order: 0 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useCreateBoqItem", () => {
  it("başarıda ['boq', siteId] anahtarını geçersiz kılar", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "i-1", code: "01.001" }));

    const { result } = renderHook(() => useCreateBoqItem(SITE_ID), { wrapper });
    act(() =>
      result.current.mutate({
        group_id: "g-1",
        code: "01.001",
        description: "Kazı (Makine ile)",
        unit: "m³",
        quantity: "1240.000",
        unit_price: "280.00",
        sort_order: 1,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(backendClient.POST).toHaveBeenCalledWith("/sites/{site_id}/boq/items", {
      params: { path: { site_id: SITE_ID } },
      body: expect.objectContaining({ code: "01.001", quantity: "1240.000" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [BOQ_QUERY_KEY, SITE_ID] });
  });
});

describe("useUpdateBoqItem", () => {
  it("başarıda ['boq', siteId] anahtarını geçersiz kılar", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "i-1", code: "01.002" }));

    const { result } = renderHook(() => useUpdateBoqItem(SITE_ID), { wrapper });
    act(() => result.current.mutate({ itemId: "i-1", body: { code: "01.002" } }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [BOQ_QUERY_KEY, SITE_ID] });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("uç yolunda siteId kullanmaz (/boq/items/{item_id})", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "i-1", code: "01.002" }));

    const { result } = renderHook(() => useUpdateBoqItem(SITE_ID), { wrapper });
    act(() => result.current.mutate({ itemId: "i-1", body: { code: "01.002" } }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/boq/items/{item_id}", {
      params: { path: { item_id: "i-1" } },
      body: { code: "01.002" },
    });
    const [, options] = vi.mocked(backendClient.PATCH).mock.calls[0] as [string, { params: { path: Record<string, string> } }];
    expect(Object.values(options.params.path)).not.toContain(SITE_ID);
  });
});

describe("ölü kod kapısı (spec §7.4, §7.5)", () => {
  it("useDeleteBoqItem ve grup PATCH hook'u yazılmamıştır", async () => {
    const mutations = await import("./useBoqMutations");
    expect(Object.keys(mutations).sort()).toEqual([
      "useCreateBoqGroup",
      "useCreateBoqItem",
      "useUpdateBoqItem",
    ]);
  });
});
