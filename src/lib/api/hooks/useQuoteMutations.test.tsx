import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreateQuote,
  useDeleteQuote,
  useSelectQuoteAndOrder,
  useUpdateQuote,
  type PurchaseQuoteCreate,
} from "./useQuoteMutations";
import { useCreateSupplier, useUpdateSupplier } from "./useSupplierMutations";
import { QUOTES_QUERY_KEY } from "./useQuotes";
import { SUPPLIERS_QUERY_KEY } from "./useSuppliers";
import {
  PURCHASE_REQUESTS_QUERY_KEY,
  PURCHASE_REQUEST_QUERY_KEY,
} from "./usePurchaseRequests";
import { PURCHASE_ORDERS_QUERY_KEY } from "./usePurchaseOrders";
import { PURCHASING_SUMMARY_QUERY_KEY } from "./usePurchasingSummary";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-SA T1 · Teklif + tedarikci yazma hook'lari.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const QUOTE: PurchaseQuoteCreate = {
  supplier_id: "sup-1",
  unit_price: "1180.00",
  delivery_time: "3 iş günü",
  warranty_note: "2 yıl garanti",
  payment_terms: "days_30",
  shipping_included: false,
  shipping_cost: "2500.00",
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function noContentResponse() {
  return { data: undefined, error: undefined, response: new Response(null, { status: 204 }) } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useCreateQuote", () => {
  /**
   * Govde anahtar kumesi TAM iddia edilir (F-PT2 karari 5). `total_cost`
   * GOVDEDE OLMAMALIDIR: sunucu turevidir, istemci hesaplarsa nakliye hariç
   * teklifler yanlis rozetlenir (TEK 90 senaryosu).
   */
  it("POST .../quotes cagirir; govde AYNEN gecer, total_cost KONMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "q-9" }));

    const { result } = renderHook(() => useCreateQuote("pr-1"), { wrapper });
    result.current.mutate(QUOTE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/purchase-requests/{request_id}/quotes", {
      params: { path: { request_id: "pr-1" } },
      body: QUOTE,
    });
    const sent = vi.mocked(backendClient.POST).mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(Object.keys(sent.body).sort()).toEqual(
      [
        "supplier_id",
        "unit_price",
        "delivery_time",
        "warranty_note",
        "payment_terms",
        "shipping_included",
        "shipping_cost",
      ].sort(),
    );
    expect(sent.body).not.toHaveProperty("total_cost");
    expect(sent.body).not.toHaveProperty("is_best_price");
  });

  it("basarida teklif listesi + talep sorgulari gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "q-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateQuote("pr-1"), { wrapper });
    result.current.mutate(QUOTE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContain(QUOTES_QUERY_KEY);
    expect(keys).toContain(PURCHASE_REQUESTS_QUERY_KEY);
    expect(keys).toContain(PURCHASE_REQUEST_QUERY_KEY);
  });

  it("404'te BackendError firlatir (govde ici tedarikci referansi)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(errorResponse(404, "Tedarikçi bulunamadı."));

    const { result } = renderHook(() => useCreateQuote("pr-1"), { wrapper });
    result.current.mutate(QUOTE);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(404);
  });
});

describe("useUpdateQuote", () => {
  it("iki path parametresini birlikte tasir; govde kismidir", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "q-1" }));

    const { result } = renderHook(() => useUpdateQuote("pr-1"), { wrapper });
    result.current.mutate({ quoteId: "q-1", body: { unit_price: "1150.00" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith(
      "/purchase-requests/{request_id}/quotes/{quote_id}",
      {
        params: { path: { request_id: "pr-1", quote_id: "q-1" } },
        body: { unit_price: "1150.00" },
      },
    );
    const sent = vi.mocked(backendClient.PATCH).mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(Object.keys(sent.body)).toEqual(["unit_price"]);
  });
});

describe("useDeleteQuote", () => {
  it("DELETE yolunu cagirir ve 204'u sorunsuz cozer", async () => {
    vi.mocked(backendClient.DELETE).mockResolvedValue(noContentResponse());

    const { result } = renderHook(() => useDeleteQuote("pr-1"), { wrapper });
    result.current.mutate("q-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.DELETE).toHaveBeenCalledWith(
      "/purchase-requests/{request_id}/quotes/{quote_id}",
      { params: { path: { request_id: "pr-1", quote_id: "q-1" } } },
    );
  });

  it("409'da BackendError firlatir (secili teklif silinemez)", async () => {
    vi.mocked(backendClient.DELETE).mockResolvedValue(
      errorResponse(409, "Siparişe bağlanmış teklif silinemez."),
    );

    const { result } = renderHook(() => useDeleteQuote("pr-1"), { wrapper });
    result.current.mutate("q-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(409);
  });
});

describe("useSelectQuoteAndOrder", () => {
  /**
   * TEK cagri iki isi birden yapar. Ikinci bir `POST /purchase-orders` cagrisi
   * IKINCI bir siparis dogururdu — bu test cagri SAYISINI da kilitler.
   */
  it("GOVDESIZ TEK cagri atar; ayrica /purchase-orders CAGRILMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      okResponse({ id: "po-9", order_no: "SP-2026-0001" }),
    );

    const { result } = renderHook(() => useSelectQuoteAndOrder("pr-1"), { wrapper });
    result.current.mutate("q-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledTimes(1);
    expect(backendClient.POST).toHaveBeenCalledWith(
      "/purchase-requests/{request_id}/quotes/{quote_id}/select-and-order",
      { params: { path: { request_id: "pr-1", quote_id: "q-1" } } },
    );
    const sent = vi.mocked(backendClient.POST).mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("body");
  });

  it("basarida DORT sorgu kumesi birden gecersiz kilinir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "po-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSelectQuoteAndOrder("pr-1"), { wrapper });
    result.current.mutate("q-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContain(QUOTES_QUERY_KEY);
    expect(keys).toContain(PURCHASE_REQUESTS_QUERY_KEY);
    expect(keys).toContain(PURCHASE_ORDERS_QUERY_KEY);
    expect(keys).toContain(PURCHASING_SUMMARY_QUERY_KEY);
  });

  it("409'da BackendError firlatir (talep zaten siparise baglandi)", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      errorResponse(409, "Bu talep için sipariş zaten oluşturulmuş."),
    );

    const { result } = renderHook(() => useSelectQuoteAndOrder("pr-1"), { wrapper });
    result.current.mutate("q-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(409);
  });
});

describe("useCreateSupplier / useUpdateSupplier", () => {
  it("POST /suppliers govdesi AYNEN gecer ve tedarikci listesi tazelenir", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse({ id: "sup-9" }));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useCreateSupplier(), { wrapper });
    result.current.mutate({
      name: "Yıldız Hazır Beton",
      category: "Hazır Beton",
      tax_no: "1234567890",
      phone: "0312 111 22 33",
      payment_terms: "days_30",
      is_active: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/suppliers", {
      body: {
        name: "Yıldız Hazır Beton",
        category: "Hazır Beton",
        tax_no: "1234567890",
        phone: "0312 111 22 33",
        payment_terms: "days_30",
        is_active: true,
      },
    });
    expect(invalidatedKeys(invalidate)).toContain(SUPPLIERS_QUERY_KEY);
  });

  /** Pasiflestirme KISMI PATCH'tir: govdede yalniz `is_active` bulunur. */
  it("PATCH /suppliers/{id} yalniz degisen anahtari tasir", async () => {
    vi.mocked(backendClient.PATCH).mockResolvedValue(okResponse({ id: "sup-1" }));

    const { result } = renderHook(() => useUpdateSupplier("sup-1"), { wrapper });
    result.current.mutate({ is_active: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.PATCH).toHaveBeenCalledWith("/suppliers/{supplier_id}", {
      params: { path: { supplier_id: "sup-1" } },
      body: { is_active: false },
    });
    const sent = vi.mocked(backendClient.PATCH).mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(Object.keys(sent.body)).toEqual(["is_active"]);
  });
});
