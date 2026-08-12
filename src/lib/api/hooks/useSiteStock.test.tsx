import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteStock, SITE_STOCK_QUERY_KEY } from "./useSiteStock";
import { useWarehouses, WAREHOUSES_QUERY_KEY } from "./useWarehouses";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-ST T1 · Şantiye stok + depo listesi hook'lari.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const SITE_ID = "s-1";
const SITE_STOCK = {
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
  kpis: {
    total_value: "0.00",
    critical_count: 0,
    low_count: 0,
    total_items: 0,
    items_without_price: 0,
  },
};
const WAREHOUSES = { items: [], total: 0, limit: 50, offset: 0 };

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

describe("useSiteStock", () => {
  it("GET /sites/{site_id}/stock cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(SITE_STOCK));

    const { result } = renderHook(() => useSiteStock(SITE_ID, { limit: 200 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/stock", {
      params: { path: { site_id: SITE_ID }, query: { limit: 200 } },
    });
    expect(client.getQueryData([SITE_STOCK_QUERY_KEY, SITE_ID, 200, null])).toEqual(SITE_STOCK);
  });

  it("bos siteId ile aga CIKMAZ", async () => {
    const { result } = renderHook(() => useSiteStock(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("404'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(404, "santiye yok"));

    const { result } = renderHook(() => useSiteStock(SITE_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(404);
  });
});

describe("useWarehouses", () => {
  it("GET /warehouses cagirir; suzgecsiz cagride sorgu BOSTUR", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(WAREHOUSES));

    const { result } = renderHook(() => useWarehouses(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/warehouses", { params: { query: {} } });
    expect(client.getQueryData([WAREHOUSES_QUERY_KEY, null, null])).toEqual(WAREHOUSES);
  });

  /**
   * Uçta `site_id` süzgeci YOKTUR — merkez/şantiye ayrımı satırın `site_id`
   * alanından yapılır. Uydurma parametre gönderilirse backend onu yok sayar
   * ve ekran "süzdüm" sanır; bu yüzden sorgu YALNIZ sayfalama taşır.
   */
  it("sayfalama disinda sorgu parametresi gondermez", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(WAREHOUSES));

    const { result } = renderHook(() => useWarehouses({ limit: 200, offset: 0 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    expect(Object.keys(call.params.query).sort()).toEqual(["limit", "offset"]);
  });

  it("403'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useWarehouses(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});
