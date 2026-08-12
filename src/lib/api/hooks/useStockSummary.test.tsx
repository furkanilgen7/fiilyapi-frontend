import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useStockSummary, STOCK_SUMMARY_QUERY_KEY } from "./useStockSummary";
import { useStockItems, STOCK_ITEMS_QUERY_KEY, STOCK_LIST_MAX_LIMIT } from "./useStockItems";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-ST T1 · Stok okuma hook'lari (`useDocuments.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const EMPTY_LIST = { items: [], total: 0, limit: 50, offset: 0 };
const EMPTY_SUMMARY = {
  ...EMPTY_LIST,
  kpis: {
    total_value: "0.00",
    critical_count: 0,
    low_count: 0,
    total_items: 0,
    items_without_price: 0,
    pending_orders: { available: false, value: null, pending_module: "procurement" },
  },
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

describe("useStockSummary", () => {
  it("suzgecsiz cagride GET /stock/summary'yi BOS sorguyla cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(EMPTY_SUMMARY));

    const { result } = renderHook(() => useStockSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/stock/summary", { params: { query: {} } });
    expect(client.getQueryData([STOCK_SUMMARY_QUERY_KEY, null, null, null, null, null])).toEqual(
      EMPTY_SUMMARY,
    );
  });

  it("durum/kategori/arama/sayfalama sorguya eklenir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(EMPTY_SUMMARY));

    const { result } = renderHook(
      () =>
        useStockSummary({
          status: "critical",
          category: "steel",
          q: "demir",
          limit: STOCK_LIST_MAX_LIMIT,
          offset: 0,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/stock/summary", {
      params: {
        query: { status: "critical", category: "steel", q: "demir", limit: 200, offset: 0 },
      },
    });
  });

  /**
   * BOŞ arama metni SÜZGEÇ DEĞİLDİR: `q=""` gönderilseydi sunucu boş dizeyle
   * eşleşme arar ve "Tümü" görünümü kaybolurdu.
   */
  it("bos arama metni sorguya HIC eklenmez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(EMPTY_SUMMARY));

    const { result } = renderHook(() => useStockSummary({ q: "", category: "interior" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    expect(Object.keys(call.params.query)).toEqual(["category"]);
  });

  it("404'te BackendError firlatir (govde YUTULMAZ)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(404, "kayit yok"));

    const { result } = renderHook(() => useStockSummary(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(404);
  });
});

describe("useStockItems", () => {
  it("GET /stock/items cagirir; suzgecler query'ye gecer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(EMPTY_LIST));

    const { result } = renderHook(
      () => useStockItems({ category: "electrical", q: "kablo", isActive: true, limit: 200 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/stock/items", {
      params: { query: { category: "electrical", q: "kablo", is_active: true, limit: 200 } },
    });
    expect(
      client.getQueryData([STOCK_ITEMS_QUERY_KEY, "electrical", "kablo", true, 200, null]),
    ).toEqual(EMPTY_LIST);
  });

  /**
   * `isActive: false` MEŞRU bir süzgeçtir (kullanımdan kaldırılmış kartlar) —
   * yanlışlıkla "verilmemiş" sayılıp düşürülmemelidir.
   */
  it("isActive=false sorguda KORUNUR", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(EMPTY_LIST));

    const { result } = renderHook(() => useStockItems({ isActive: false }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/stock/items", {
      params: { query: { is_active: false } },
    });
  });

  it("STOCK_LIST_MAX_LIMIT semadaki tavanla ayni", () => {
    expect(STOCK_LIST_MAX_LIMIT).toBe(200);
  });

  it("403'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useStockItems(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});
