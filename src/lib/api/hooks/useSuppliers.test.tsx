import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSuppliers } from "./useSuppliers";
import { usePurchaseOrders } from "./usePurchaseOrders";
import { usePurchasingSummary } from "./usePurchasingSummary";
import { useQuotes } from "./useQuotes";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-SA T1 · Satinalma OKUMA hook'larinin geri kalani (tedarikci · siparis ·
// KPI seridi · teklif) — hepsi ayni desende oldugu icin tek dosyada.
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

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useSuppliers", () => {
  it("suzgecsiz cagrida query BOSTUR", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => useSuppliers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/suppliers", { params: { query: {} } });
  });

  it("q/category/limit/offset SUNUCU query'sine duser", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 10, offset: 0 }),
    );

    const { result } = renderHook(
      () => useSuppliers({ q: "demir", category: "Hazır Beton", limit: 10, offset: 0 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/suppliers", {
      params: { query: { q: "demir", category: "Hazır Beton", limit: 10, offset: 0 } },
    });
  });

  /**
   * `is_active: false` GECERLI bir suzgectir ("pasif tedarikciler"). Dogruluk
   * denetimi yapilsaydi bu suzgec sessizce DUSER ve ekran pasifleri
   * suzemezdi.
   */
  it("is_active=false suzgeci DUSMEZ (dogruluk degil undefined denetlenir)", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(() => useSuppliers({ isActive: false }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/suppliers", {
      params: { query: { is_active: false } },
    });
  });
});

describe("usePurchaseOrders", () => {
  it("dort suzgec de SUNUCU query'sine duser", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, limit: 50, offset: 0 }),
    );

    const { result } = renderHook(
      () =>
        usePurchaseOrders({
          status: "in_transit",
          projectId: "p-1",
          supplierId: "sup-1",
          q: "SP-2026",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchase-orders", {
      params: {
        query: {
          status: "in_transit",
          project_id: "p-1",
          supplier_id: "sup-1",
          q: "SP-2026",
        },
      },
    });
  });
});

describe("usePurchasingSummary", () => {
  /**
   * KPI seridinin ucu `purchasing` kokundedir — `purchase-requests`in ALTINDA
   * DEGILDIR. Yol yanlis yazilirsa BFF izin listesi kokunu bosuna acmis olur
   * ve serit CANLIDA bos kalir.
   */
  it("purchasing kokunden cagirir; proje suzgeci opsiyoneldir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({
        open_requests: 3,
        quote_wait_requests: 1,
        pending_approval_requests: 2,
        orders_this_month_total: "125000.00",
        active_orders: 4,
        in_transit_orders: 2,
        delivered_orders: 7,
      }),
    );

    const { result } = renderHook(() => usePurchasingSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchasing/summary", {
      params: { query: {} },
    });
    expect(result.current.data?.pending_approval_requests).toBe(2);
  });

  it("project_id verilirse query'ye konur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({
        open_requests: 0,
        quote_wait_requests: 0,
        pending_approval_requests: 0,
        orders_this_month_total: "0.00",
        active_orders: 0,
        in_transit_orders: 0,
        delivered_orders: 0,
      }),
    );

    const { result } = renderHook(() => usePurchasingSummary("p-2"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchasing/summary", {
      params: { query: { project_id: "p-2" } },
    });
  });
});

describe("useQuotes", () => {
  it("bos talep id'siyle aga CIKILMAZ", () => {
    renderHook(() => useQuotes(""), { wrapper });
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  /** Uc SAYFASIZDIR: limit/offset gonderilmez (uydurma parametre 422 uretir). */
  it("talep altindaki teklifleri SAYFALAMASIZ cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(
      okResponse({ items: [], total: 0, request_quantity_total: "0.000" }),
    );

    const { result } = renderHook(() => useQuotes("pr-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/purchase-requests/{request_id}/quotes", {
      params: { path: { request_id: "pr-1" } },
    });
  });

  it("403'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "Yetkiniz yok."));

    const { result } = renderHook(() => useQuotes("pr-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});
